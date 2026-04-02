export type ProposalLineItem = {
  label: string;
  quantity: number;
  unitPriceCents: number;
};

export type CreateProposalInput = {
  leadId: string;
  title: string;
  lineItems: ProposalLineItem[];
  notes?: string;
};

export type CreateInvoiceInput = {
  leadId: string;
  proposalId?: string;
  totalCents: number;
  dueAt?: string;
};

export type CheckoutItemInput = {
  productId: string;
  quantity: number;
  isUpsell?: boolean;
  isDownsell?: boolean;
};

export type CreateCheckoutInput = {
  leadId: string;
  items: CheckoutItemInput[];
  successUrl: string;
  cancelUrl: string;
};

export type TextToPayInput = {
  leadId: string;
  productId: string;
  quantity?: number;
  successUrl: string;
  cancelUrl: string;
};

export type CreateDepositInput = {
  invoiceId: string;
  /** Percentage of invoice total to collect as deposit (1–100). Defaults to 30. */
  depositPercent?: number;
  /** Optional idempotency key to prevent duplicate PaymentIntents. */
  idempotencyKey?: string;
};

export type DepositIntentResult = {
  paymentIntentId: string;
  clientSecret: string;
  depositCents: number;
  invoiceTotalCents: number;
  leadId: string;
};

export type MoveStageInput = {
  leadId: string;
  newStage: string;
};
