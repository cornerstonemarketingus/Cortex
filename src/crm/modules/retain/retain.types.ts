import type { ChannelType, LoyaltyEventType } from '@/generated/crm-client';

export type RequestReviewInput = {
  leadId: string;
  channel: ChannelType;
  message?: string;
};

export type CreateReviewInput = {
  leadId: string;
  source: string;
  rating: number;
  comment?: string;
};

export type CreateReferralProgramInput = {
  name: string;
  rewardCents: number;
};

export type CreateReferralLinkInput = {
  leadId: string;
  programId: string;
};

export type AwardLoyaltyInput = {
  leadId: string;
  type: LoyaltyEventType;
  points: number;
  metadata?: Record<string, unknown>;
};
