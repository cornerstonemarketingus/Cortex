import Stripe from 'stripe';
import { ApiError } from '@/src/crm/core/api';
import { crmDb } from '@/src/crm/core/crmDb';
import { getStripeSecretKey } from '@/src/crm/core/env';

const SUPPORTED_TIERS = ['starter', 'growth', 'pro', 'unified'] as const;

type SubscriptionTier = (typeof SUPPORTED_TIERS)[number];

type SubscriptionSnapshot = {
  active: boolean;
  email: string;
  tier: SubscriptionTier | null;
  includedCredits: number;
  usedCredits: number;
  remainingCredits: number;
  periodStartIso: string | null;
  periodEndIso: string | null;
};

function getStripeClient() {
  const stripeKey = getStripeSecretKey();
  if (!stripeKey) {
    throw new ApiError(500, 'Missing STRIPE_SECRET_KEY', 'STRIPE_KEY_MISSING');
  }

  return new Stripe(stripeKey, {
    apiVersion: '2026-02-25.clover',
  });
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseTier(value: string | null | undefined): SubscriptionTier {
  const normalized = (value || '').trim().toLowerCase();
  if ((SUPPORTED_TIERS as readonly string[]).includes(normalized)) {
    return normalized as SubscriptionTier;
  }
  return 'unified';
}

function getTierConfig(tier: SubscriptionTier) {
  switch (tier) {
    case 'starter':
      return { monthlyPriceCents: 7900, includedCredits: 150 };
    case 'growth':
      return { monthlyPriceCents: 14900, includedCredits: 400 };
    case 'pro':
      return { monthlyPriceCents: 29900, includedCredits: 1200 };
    case 'unified':
    default:
      return { monthlyPriceCents: 79900, includedCredits: 4000 };
  }
}

function getTokenPackConfig(packId: string) {
  const normalized = packId.trim().toLowerCase();
  switch (normalized) {
    case 'boost-500':
      return { id: 'boost-500', credits: 500, priceCents: 4900, label: 'Boost 500' };
    case 'pro-1500':
      return { id: 'pro-1500', credits: 1500, priceCents: 12900, label: 'Pro 1500' };
    case 'scale-5000':
      return { id: 'scale-5000', credits: 5000, priceCents: 34900, label: 'Scale 5000' };
    default:
      return { id: 'boost-500', credits: 500, priceCents: 4900, label: 'Boost 500' };
  }
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function firstNameFromEmail(email: string) {
  const local = email.split('@')[0] || 'Customer';
  const cleaned = local.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  if (!cleaned) return 'Customer';
  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
    .slice(0, 60);
}

async function ensureLeadByEmail(email: string) {
  const normalized = normalizeEmail(email);
  const existing = await crmDb.lead.findUnique({ where: { email: normalized } });
  if (existing) return existing;

  return crmDb.lead.create({
    data: {
      firstName: firstNameFromEmail(normalized),
      email: normalized,
      metadata: {
        billing: {
          createdFrom: 'subscription-signup',
        },
      },
      tags: ['billing-subscriber'],
    },
  });
}

async function findCustomerByEmail(stripe: Stripe, email: string) {
  const customers = await stripe.customers.list({ email, limit: 1 });
  return customers.data[0] || null;
}

type ActiveSubscription = {
  subscription: Stripe.Subscription;
  customerId: string;
};

function getSubscriptionPeriodWindow(subscription: Stripe.Subscription) {
  const fromRoot = subscription as unknown as {
    current_period_start?: number;
    current_period_end?: number;
    billing_cycle_anchor?: number;
  };

  const firstItem = subscription.items.data[0] as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  } | undefined;

  const nowUnix = Math.floor(Date.now() / 1000);
  const startUnix =
    firstItem?.current_period_start ||
    fromRoot.current_period_start ||
    fromRoot.billing_cycle_anchor ||
    nowUnix;
  const endUnix =
    firstItem?.current_period_end ||
    fromRoot.current_period_end ||
    startUnix + 30 * 24 * 60 * 60;

  return {
    startUnix,
    endUnix,
  };
}

async function getActiveSubscriptionByEmail(stripe: Stripe, email: string): Promise<ActiveSubscription | null> {
  const customer = await findCustomerByEmail(stripe, email);
  if (!customer || typeof customer.id !== 'string') return null;

  const subscriptions = await stripe.subscriptions.list({
    customer: customer.id,
    status: 'all',
    limit: 20,
  });

  const active = subscriptions.data.find((subscription) => {
    return subscription.status === 'active' || subscription.status === 'trialing';
  });

  if (!active) return null;

  return {
    subscription: active,
    customerId: customer.id,
  };
}

function extractTierFromSubscription(subscription: Stripe.Subscription): SubscriptionTier {
  const metadataTier = (subscription.metadata?.tier || '').trim().toLowerCase();
  if ((SUPPORTED_TIERS as readonly string[]).includes(metadataTier)) {
    return metadataTier as SubscriptionTier;
  }

  const firstLine = subscription.items.data[0];
  const nickname = (firstLine?.price?.nickname || '').trim().toLowerCase();
  if ((SUPPORTED_TIERS as readonly string[]).includes(nickname)) {
    return nickname as SubscriptionTier;
  }

  return 'unified';
}

function getBillingBlock(metadata: unknown) {
  const root = toRecord(metadata);
  const billing = toRecord(root.billing);
  return { root, billing };
}

function numberFromUnknown(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function estimateReaderUsageUnits(input: {
  fileCount: number;
  descriptionLength: number;
}): number {
  const filesUnits = Math.max(0, Math.floor(input.fileCount)) * 2;
  const descriptionUnits = Math.ceil(Math.max(0, input.descriptionLength) / 900);
  return Math.max(1, filesUnits + descriptionUnits);
}

export async function createSubscriptionCheckoutSession(params: {
  email: string;
  tier?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const email = normalizeEmail(params.email);
  if (!isValidEmail(email)) {
    throw new ApiError(400, 'A valid email address is required.', 'INVALID_EMAIL');
  }

  const tier = parseTier(params.tier);
  const tierConfig = getTierConfig(tier);
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          recurring: {
            interval: 'month',
          },
          product_data: {
            name: `Estimate Reader ${tier.toUpperCase()} Plan`,
            description: `Includes ${tierConfig.includedCredits} monthly estimate-reader credits.`,
          },
          unit_amount: tierConfig.monthlyPriceCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      purpose: 'estimate_reader_subscription',
      tier,
      email,
      includedCredits: String(tierConfig.includedCredits),
    },
    allow_promotion_codes: true,
  });

  return {
    sessionId: session.id,
    checkoutUrl: session.url,
  };
}

export async function createTokenPackCheckoutSession(params: {
  email: string;
  packId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const email = normalizeEmail(params.email);
  if (!isValidEmail(email)) {
    throw new ApiError(400, 'A valid email address is required.', 'INVALID_EMAIL');
  }

  const pack = getTokenPackConfig(params.packId);
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Builder Copilot Token Pack - ${pack.label}`,
            description: `${pack.credits} usage tokens for estimator, automations, and copilot operations.`,
          },
          unit_amount: pack.priceCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      purpose: 'token_pack_purchase',
      email,
      tokenPackId: pack.id,
      tokenCredits: String(pack.credits),
    },
    allow_promotion_codes: true,
  });

  return {
    sessionId: session.id,
    checkoutUrl: session.url,
    pack,
  };
}

export async function getSubscriptionSnapshot(emailInput: string): Promise<SubscriptionSnapshot> {
  const email = normalizeEmail(emailInput);
  if (!isValidEmail(email)) {
    throw new ApiError(400, 'A valid email address is required.', 'INVALID_EMAIL');
  }

  const stripe = getStripeClient();
  const activeSub = await getActiveSubscriptionByEmail(stripe, email);

  if (!activeSub) {
    return {
      active: false,
      email,
      tier: null,
      includedCredits: 0,
      usedCredits: 0,
      remainingCredits: 0,
      periodStartIso: null,
      periodEndIso: null,
    };
  }

  const lead = await ensureLeadByEmail(email);
  const tier = extractTierFromSubscription(activeSub.subscription);
  const tierConfig = getTierConfig(tier);
  const periodWindow = getSubscriptionPeriodWindow(activeSub.subscription);

  const periodStartIso = new Date(periodWindow.startUnix * 1000).toISOString();
  const periodEndIso = new Date(periodWindow.endUnix * 1000).toISOString();

  const usageEvents = await crmDb.interaction.findMany({
    where: {
      leadId: lead.id,
      type: 'estimate_reader_usage',
      createdAt: {
        gte: new Date(periodWindow.startUnix * 1000),
      },
    },
    select: {
      payload: true,
    },
  });

  const usedCredits = usageEvents.reduce((sum, event) => {
    const payload = toRecord(event.payload);
    return sum + Math.max(0, numberFromUnknown(payload.units));
  }, 0);

  const remainingCredits = Math.max(0, tierConfig.includedCredits - usedCredits);

  return {
    active: true,
    email,
    tier,
    includedCredits: tierConfig.includedCredits,
    usedCredits,
    remainingCredits,
    periodStartIso,
    periodEndIso,
  };
}

export async function consumeEstimateReaderCredits(params: {
  email: string;
  units: number;
  context?: Record<string, unknown>;
}) {
  const units = Math.max(1, Math.floor(params.units));
  const snapshot = await getSubscriptionSnapshot(params.email);

  if (!snapshot.active) {
    throw new ApiError(
      402,
      'Active paid subscription required before launching AI estimate reader results.',
      'SUBSCRIPTION_REQUIRED'
    );
  }

  if (snapshot.remainingCredits < units) {
    throw new ApiError(
      402,
      `Insufficient credits for this estimate reader run. Required: ${units}, remaining: ${snapshot.remainingCredits}.`,
      'CREDITS_EXHAUSTED',
      {
        requiredUnits: units,
        remainingCredits: snapshot.remainingCredits,
      }
    );
  }

  const lead = await ensureLeadByEmail(snapshot.email);

  await crmDb.interaction.create({
    data: {
      leadId: lead.id,
      type: 'estimate_reader_usage',
      payload: {
        units,
        tier: snapshot.tier,
        email: snapshot.email,
        periodStartIso: snapshot.periodStartIso,
        ...(params.context || {}),
      },
    },
  });

  return {
    consumedUnits: units,
    remainingCredits: Math.max(0, snapshot.remainingCredits - units),
    includedCredits: snapshot.includedCredits,
    usedCredits: snapshot.usedCredits + units,
    tier: snapshot.tier,
    periodEndIso: snapshot.periodEndIso,
  };
}

export async function consumePromptCredits(params: {
  email: string;
  units: number;
  context?: Record<string, unknown>;
}) {
  const units = Math.max(1, Math.floor(params.units));
  const snapshot = await getSubscriptionSnapshot(params.email);

  if (!snapshot.active) {
    throw new ApiError(
      402,
      'Active paid subscription is required for AI prompt execution.',
      'SUBSCRIPTION_REQUIRED'
    );
  }

  if (snapshot.remainingCredits < units) {
    throw new ApiError(
      402,
      `Insufficient prompt credits. Required: ${units}, remaining: ${snapshot.remainingCredits}.`,
      'CREDITS_EXHAUSTED',
      {
        requiredUnits: units,
        remainingCredits: snapshot.remainingCredits,
      }
    );
  }

  const lead = await ensureLeadByEmail(snapshot.email);
  await crmDb.interaction.create({
    data: {
      leadId: lead.id,
      type: 'platform_prompt_usage',
      payload: {
        units,
        tier: snapshot.tier,
        email: snapshot.email,
        periodStartIso: snapshot.periodStartIso,
        ...(params.context || {}),
      },
    },
  });

  return {
    consumedUnits: units,
    remainingCredits: Math.max(0, snapshot.remainingCredits - units),
    includedCredits: snapshot.includedCredits,
    usedCredits: snapshot.usedCredits + units,
    tier: snapshot.tier,
    periodEndIso: snapshot.periodEndIso,
  };
}

export async function syncSubscriptionEvent(event: Stripe.Event) {
  const stripe = getStripeClient();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.purpose !== 'estimate_reader_subscription') {
      return null;
    }

    const email = normalizeEmail(
      session.customer_details?.email || session.customer_email || session.metadata?.email || ''
    );
    if (!isValidEmail(email)) {
      return null;
    }

    const lead = await ensureLeadByEmail(email);
    const tier = parseTier(session.metadata?.tier);
    const { root, billing } = getBillingBlock(lead.metadata);

    await crmDb.lead.update({
      where: { id: lead.id },
      data: {
        metadata: {
          ...root,
          billing: {
            status: 'active',
            tier,
            source: 'stripe_checkout_session_completed',
            stripeCustomerId:
              typeof session.customer === 'string'
                ? session.customer
                : toOptionalString(billing.stripeCustomerId),
            stripeSubscriptionId:
              typeof session.subscription === 'string'
                ? session.subscription
                : toOptionalString(billing.stripeSubscriptionId),
            lastEventId: event.id,
            updatedAt: new Date().toISOString(),
          },
        },
      },
    });

    await crmDb.interaction.create({
      data: {
        leadId: lead.id,
        type: 'billing_subscription_activated',
        payload: {
          tier,
          stripeSessionId: session.id,
          stripeSubscriptionId:
            typeof session.subscription === 'string' ? session.subscription : null,
          eventId: event.id,
        },
      },
    });

    return { handled: true, kind: 'subscription_activated' };
  }

  if (
    event.type === 'customer.subscription.deleted' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'invoice.payment_failed'
  ) {
    let email = '';

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      email = normalizeEmail(invoice.customer_email || '');
      if (!email && typeof invoice.customer === 'string') {
        const customer = await stripe.customers.retrieve(invoice.customer);
        if (!('deleted' in customer)) {
          email = normalizeEmail(customer.email || '');
        }
      }
    } else {
      const subscription = event.data.object as Stripe.Subscription;
      if (subscription.customer && typeof subscription.customer === 'string') {
        const customer = await stripe.customers.retrieve(subscription.customer);
        if (!('deleted' in customer)) {
          email = normalizeEmail(customer.email || '');
        }
      }
    }

    if (!isValidEmail(email)) {
      return null;
    }

    const lead = await ensureLeadByEmail(email);
    const { root } = getBillingBlock(lead.metadata);

    const status = event.type === 'customer.subscription.deleted' ? 'canceled' : event.type === 'invoice.payment_failed' ? 'past_due' : 'updated';

    await crmDb.lead.update({
      where: { id: lead.id },
      data: {
        metadata: {
          ...root,
          billing: {
            status,
            source: `stripe_${event.type}`,
            lastEventId: event.id,
            updatedAt: new Date().toISOString(),
          },
        },
      },
    });

    await crmDb.interaction.create({
      data: {
        leadId: lead.id,
        type: 'billing_subscription_event',
        payload: {
          eventType: event.type,
          eventId: event.id,
          status,
        },
      },
    });

    return { handled: true, kind: 'subscription_status_changed' };
  }

  return null;
}
