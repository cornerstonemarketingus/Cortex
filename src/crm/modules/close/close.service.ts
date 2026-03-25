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
  CreateInvoiceInput,
  CreateProposalInput,
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

    return {
      received: true,
      eventType: event.type,
      subscriptionSync,
    };
  }
}
