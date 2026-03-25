import type { ChannelType, LeadSourceType } from '@/generated/crm-client';

export type CreateLeadInput = {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  timezone?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  sourceType: LeadSourceType;
  sourceName: string;
  campaignName?: string;
  firstMessage?: string;
  firstMessageChannel?: ChannelType;
};

export type InboundWebhookPayload = {
  source: string;
  channel: ChannelType;
  direction?: 'INBOUND' | 'OUTBOUND';
  externalThreadId?: string;
  lead: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  content: string;
  metadata?: Record<string, unknown>;
};

export type InboundCallPayload = {
  fromNumber: string;
  toNumber?: string;
  durationSec?: number;
  wasMissed?: boolean;
  campaignId?: string;
  metadata?: Record<string, unknown>;
};

export type CaptureFormInput = {
  name: string;
  slug: string;
  schemaJson: Record<string, unknown>;
  isActive?: boolean;
};

export type LandingPageInput = {
  name: string;
  slug: string;
  configJson: Record<string, unknown>;
  isPublished?: boolean;
};

export type BusinessCardScanInput = {
  imageDataUrl?: string;
  rawText?: string;
};

export type ParsedBusinessCard = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  company?: string;
  title?: string;
  email?: string;
  phone?: string;
  website?: string;
};
