import Stripe from 'stripe';
import PDFDocument from 'pdfkit';
import {
  PaymentStatus,
  type Invoice,
  type Lead,
  type Proposal,
} from '@/generated/crm-client';
import { ApiError } from '@/src/crm/core/api';
import { crmDb } from '@/src/crm/core/crmDb';
import { getStripeSecretKey } from '@/src/crm/core/env';
import { syncSubscriptionEvent } from '@/src/billing/subscription.service';
import type {
  CreateCheckoutInput,
  CreateDepositInput,
  CreateInvoiceInput,
  CreateProposalInput,
  DepositIntentResult,
  ProposalLineItem,
  TextToPayInput,
} from './close.types';
import { LeadScoringService } from './lead-scoring.service';

function getStripeClient() {
  const stripeKey = getStripeSecretKey();
  if (!stripeKey) {
    throw new ApiError(500, 'Missing STRIPE_SECRET_KEY', 'STRIPE_KEY_MISSING');
  }

  return new Stripe(stripeKey, {
    apiVersion: '2026-02-25.clover',
  });
}

function formatCurrency(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function computeTotal(lineItems: ProposalLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
}

async function buildProposalPdf(
  proposal: Proposal,
  lead: Lead,
  lineItems: ProposalLineItem[],
  notes?: string
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 48 });
  const chunks: Buffer[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text(proposal.title);
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Proposal ID: ${proposal.id}`);
    doc.text(`Lead: ${lead.firstName} ${lead.lastName || ''}`.trim());
    doc.text(`Email: ${lead.email || 'n/a'}`);
    doc.text(`Phone: ${lead.phone || 'n/a'}`);
    doc.moveDown();

    doc.fontSize(14).text('Line Items');
    doc.moveDown(0.5);

    for (const item of lineItems) {
      doc.fontSize(11).text(
        `${item.label} - ${item.quantity} x ${formatCurrency(item.unitPriceCents)} = ${formatCurrency(item.quantity * item.unitPriceCents)}`
      );
    }

    doc.moveDown();
    doc.fontSize(14).text(`Total: ${formatCurrency(proposal.totalCents)}`);

    if (notes) {
      doc.moveDown();
      doc.fontSize(12).text('Notes');
      doc.fontSize(10).text(notes);
    }

    doc.end();
  });
}

export class CloseService {
  private readonly leadScoringService = new LeadScoringService();

  async createProposal(input: CreateProposalInput) {
    if (!input.lineItems || input.lineItems.length === 0) {
      throw new ApiError(400, 'At least one proposal line item is required', 'PROPOSAL_ITEMS_REQUIRED');
    }

    const lead = await crmDb.lead.findUnique({ where: { id: input.leadId } });
    if (!lead) {
      throw new ApiError(404, 'Lead not found', 'LEAD_NOT_FOUND');
    }

    const totalCents = computeTotal(input.lineItems);

    const proposal = await crmDb.proposal.create({
      data: {
        leadId: input.leadId,
        title: input.title,
        contentJson: {
          lineItems: input.lineItems,
          notes: input.notes,
        },
        totalCents,
        status: PaymentStatus.DRAFT,
      },
    });

    await crmDb.interaction.create({
      data: {
        leadId: input.leadId,
        type: 'proposal_created',
        payload: {
          proposalId: proposal.id,
          totalCents,
        },
      },
    });

    await this.leadScoringService.updateLeadScore(input.leadId);

    return proposal;
  }

  async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    const lead = await crmDb.lead.findUnique({ where: { id: input.leadId } });
    if (!lead) {
      throw new ApiError(404, 'Lead not found', 'LEAD_NOT_FOUND');
    }

    const number = `INV-${Date.now()}`;

    const invoice = await crmDb.invoice.create({
      data: {
        number,
        leadId: input.leadId,
        proposalId: input.proposalId,
        totalCents: input.totalCents,
        status: PaymentStatus.PENDING,
        dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
      },
    });

    await crmDb.interaction.create({
      data: {
        leadId: input.leadId,
        type: 'invoice_created',
        payload: {
          invoiceId: invoice.id,
          number,
          totalCents: input.totalCents,
        },
      },
    });

    return invoice;
  }

  async createCheckout(input: CreateCheckoutInput) {
    const stripe = getStripeClient();

    const lead = await crmDb.lead.findUnique({ where: { id: input.leadId } });
    if (!lead) {
      throw new ApiError(404, 'Lead not found', 'LEAD_NOT_FOUND');
    }

    const products = await crmDb.product.findMany({
      where: {
        id: {
          in: input.items.map((item) => item.productId),
        },
        active: true,
      },
    });

    const productMap = new Map(products.map((product) => [product.id, product]));

    if (products.length !== input.items.length) {
      throw new ApiError(400, 'One or more checkout products are invalid', 'INVALID_PRODUCTS');
    }

    const lineItems = input.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new ApiError(400, `Product ${item.productId} not found`, 'PRODUCT_NOT_FOUND');
      }

      return {
        price_data: {
          currency: product.currency.toLowerCase(),
          product_data: {
            name: product.name,
            description: product.description || undefined,
          },
          unit_amount: product.priceCents,
        },
        quantity: item.quantity,
      };
    });

    const totalCents = input.items.reduce((sum, item) => {
      const product = productMap.get(item.productId);
      return sum + (product ? product.priceCents * item.quantity : 0);
    }, 0);

    const order = await crmDb.order.create({
      data: {
        leadId: input.leadId,
        totalCents,
        status: PaymentStatus.PENDING,
        items: {
          create: input.items.map((item) => {
            const product = productMap.get(item.productId);
            if (!product) {
              throw new ApiError(400, `Product ${item.productId} not found`, 'PRODUCT_NOT_FOUND');
            }

            return {
              productId: item.productId,
              quantity: item.quantity,
              unitPriceCents: product.priceCents,
              isUpsell: item.isUpsell || false,
              isDownsell: item.isDownsell || false,
            };
          }),
        },
      },
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      customer_email: lead.email || undefined,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: {
        orderId: order.id,
        leadId: lead.id,
      },
    });

    await crmDb.order.update({
      where: { id: order.id },
      data: {
        stripeCheckoutSessionId: session.id,
      },
    });

    await crmDb.interaction.create({
      data: {
        leadId: input.leadId,
        type: 'checkout_created',
        payload: {
          orderId: order.id,
          stripeSessionId: session.id,
          totalCents,
        },
      },
    });

    return {
      orderId: order.id,
      stripeSessionId: session.id,
      checkoutUrl: session.url,
    };
  }

  async createTextToPay(input: TextToPayInput) {
    const checkout = await this.createCheckout({
      leadId: input.leadId,
      items: [
        {
          productId: input.productId,
          quantity: input.quantity || 1,
        },
      ],
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });

    return {
      ...checkout,
      smsText: `Pay securely using this link: ${checkout.checkoutUrl}`,
    };
  }

  async generateProposalPdf(proposalId: string) {
    const proposal = await crmDb.proposal.findUnique({
      where: { id: proposalId },
      include: {
        lead: true,
      },
    });

    if (!proposal) {
      throw new ApiError(404, 'Proposal not found', 'PROPOSAL_NOT_FOUND');
    }

    const content = proposal.contentJson as { lineItems?: ProposalLineItem[]; notes?: string };
    const lineItems = content.lineItems || [];

    const pdfBuffer = await buildProposalPdf(proposal, proposal.lead, lineItems, content.notes);

    await crmDb.interaction.create({
      data: {
        leadId: proposal.leadId,
        type: 'proposal_pdf_generated',
        payload: {
          proposalId,
          bytes: pdfBuffer.byteLength,
        },
      },
    });

    return pdfBuffer;
  }

  async createDepositIntent(input: CreateDepositInput): Promise<DepositIntentResult> {
    const stripe = getStripeClient();

    const pct = Math.max(1, Math.min(100, input.depositPercent ?? 30));

    const invoice = await crmDb.invoice.findUnique({
      where: { id: input.invoiceId },
      include: { lead: true },
    });

    if (!invoice) {
      throw new ApiError(404, 'Invoice not found', 'INVOICE_NOT_FOUND');
    }

    const depositCents = Math.round((invoice.totalCents * pct) / 100);

    if (depositCents < 50) {
      throw new ApiError(400, 'Deposit amount is below Stripe minimum ($0.50)', 'DEPOSIT_TOO_LOW');
    }

    const existingRecord = await crmDb.paymentIntentRecord.findFirst({
      where: {
        invoiceId: invoice.id,
        status: PaymentStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingRecord) {
      const existing = await stripe.paymentIntents.retrieve(existingRecord.stripePaymentIntentId);
      if (
        existing.status === 'requires_payment_method' ||
        existing.status === 'requires_confirmation' ||
        existing.status === 'requires_action'
      ) {
        return {
          paymentIntentId: existing.id,
          clientSecret: existing.client_secret!,
          depositCents,
          invoiceTotalCents: invoice.totalCents,
          leadId: invoice.leadId,
        };
      }
    }

    const createParams: Stripe.PaymentIntentCreateParams = {
      amount: depositCents,
      currency: invoice.currency.toLowerCase(),
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        leadId: invoice.leadId,
        depositPercent: String(pct),
      },
      receipt_email: invoice.lead.email || undefined,
      description: `Deposit for Invoice ${invoice.number} (${pct}%)`,
    };

    const intentCreateOptions: Stripe.RequestOptions = input.idempotencyKey
      ? { idempotencyKey: input.idempotencyKey }
      : {};

    const intent = await stripe.paymentIntents.create(createParams, intentCreateOptions);

    await crmDb.paymentIntentRecord.create({
      data: {
        invoiceId: invoice.id,
        stripePaymentIntentId: intent.id,
        amountCents: depositCents,
        currency: intent.currency.toUpperCase(),
        status: PaymentStatus.PENDING,
        metadata: {
          depositPercent: pct,
          invoiceNumber: invoice.number,
        },
      },
    });

    await crmDb.interaction.create({
      data: {
        leadId: invoice.leadId,
        type: 'deposit_intent_created',
        payload: {
          invoiceId: invoice.id,
          paymentIntentId: intent.id,
          depositCents,
          depositPercent: pct,
        },
      },
    });

    await this.leadScoringService.updateLeadScore(invoice.leadId);

    return {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret!,
      depositCents,
      invoiceTotalCents: invoice.totalCents,
      leadId: invoice.leadId,
    };
  }

  async handleStripeWebhook(signature: string | null, payload: string) {
    const stripe = getStripeClient();
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      throw new ApiError(500, 'Missing STRIPE_WEBHOOK_SECRET', 'STRIPE_WEBHOOK_SECRET_MISSING');
    }

    if (!signature) {
      throw new ApiError(400, 'Missing Stripe signature', 'MISSING_STRIPE_SIGNATURE');
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
    } catch {
      throw new ApiError(400, 'Invalid Stripe signature', 'INVALID_STRIPE_SIGNATURE');
    }

    const subscriptionSync = await syncSubscriptionEvent(event);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        const order = await crmDb.order.update({
          where: { id: orderId },
          data: {
            status: PaymentStatus.PAID,
          },
        });

        await crmDb.interaction.create({
          data: {
            leadId: order.leadId,
            type: 'payment_completed',
            payload: {
              stripeSessionId: session.id,
              orderId,
            },
          },
        });

        await this.leadScoringService.updateLeadScore(order.leadId);
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;

      const record = await crmDb.paymentIntentRecord.findUnique({
        where: { stripePaymentIntentId: intent.id },
      });

      if (record) {
        await crmDb.paymentIntentRecord.update({
          where: { id: record.id },
          data: { status: PaymentStatus.PAID },
        });

        if (record.invoiceId) {
          const invoice = await crmDb.invoice.findUnique({
            where: { id: record.invoiceId },
            include: { paymentIntentRecords: true },
          });

          if (invoice) {
            const totalPaidCents = invoice.paymentIntentRecords
              .filter((r) => r.id === record.id ? true : r.status === PaymentStatus.PAID)
              .reduce((sum, r) => sum + r.amountCents, 0);

            const newStatus =
              totalPaidCents >= invoice.totalCents
                ? PaymentStatus.PAID
                : PaymentStatus.PENDING;

            await crmDb.invoice.update({
              where: { id: invoice.id },
              data: {
                status: newStatus,
                paidAt: newStatus === PaymentStatus.PAID ? new Date() : undefined,
              },
            });

            await crmDb.interaction.create({
              data: {
                leadId: invoice.leadId,
                type: 'deposit_payment_succeeded',
                payload: {
                  paymentIntentId: intent.id,
                  invoiceId: invoice.id,
                  amountCents: record.amountCents,
                  totalPaidCents,
                  invoiceFullyPaid: newStatus === PaymentStatus.PAID,
                },
              },
            });

            await this.leadScoringService.updateLeadScore(invoice.leadId);
          }
        }
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;

      const record = await crmDb.paymentIntentRecord.findUnique({
        where: { stripePaymentIntentId: intent.id },
      });

      if (record) {
        await crmDb.paymentIntentRecord.update({
          where: { id: record.id },
          data: { status: PaymentStatus.FAILED },
        });

        if (record.invoiceId) {
          const invoice = await crmDb.invoice.findUnique({
            where: { id: record.invoiceId },
          });

          if (invoice) {
            await crmDb.interaction.create({
              data: {
                leadId: invoice.leadId,
                type: 'deposit_payment_failed',
                payload: {
                  paymentIntentId: intent.id,
                  invoiceId: invoice.id,
                  amountCents: record.amountCents,
                  failureMessage: intent.last_payment_error?.message,
                  failureCode: intent.last_payment_error?.code,
                },
              },
            });
          }
        }
      }
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      if (charge.payment_intent && typeof charge.payment_intent === 'string') {
        const record = await crmDb.paymentIntentRecord.findUnique({
          where: { stripePaymentIntentId: charge.payment_intent },
        });

        if (record) {
          await crmDb.paymentIntentRecord.update({
            where: { id: record.id },
            data: { status: PaymentStatus.REFUNDED },
          });

          if (record.invoiceId) {
            const invoice = await crmDb.invoice.findUnique({
              where: { id: record.invoiceId },
            });

            if (invoice) {
              await crmDb.invoice.update({
                where: { id: invoice.id },
                data: { status: PaymentStatus.REFUNDED },
              });

              await crmDb.interaction.create({
                data: {
                  leadId: invoice.leadId,
                  type: 'payment_refunded',
                  payload: {
                    chargeId: charge.id,
                    paymentIntentId: charge.payment_intent,
                    amountRefundedCents: charge.amount_refunded,
                  },
                },
              });
            }
          }
        }
      }
    }

    return {
      received: true,
      eventType: event.type,
      subscriptionSync,
    };
  }
}
