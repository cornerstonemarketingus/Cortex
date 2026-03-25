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
