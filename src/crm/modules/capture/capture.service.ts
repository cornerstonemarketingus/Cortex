import QRCode from 'qrcode';
import {
  ChannelType,
  ConversationDirection,
  LeadSourceType,
  type Lead,
} from '@/generated/crm-client';
import { crmDb } from '@/src/crm/core/crmDb';
import { ApiError } from '@/src/crm/core/api';
import { enqueueWorkflowEvent } from '@/src/crm/core/queue';
import { getOpenAiApiKey, getOpenAiModel } from '@/src/crm/core/env';
import { toPrismaJson, toPrismaRequiredJson } from '@/src/crm/core/json';
import type {
  BusinessCardScanInput,
  CaptureFormInput,
  CreateLeadInput,
  InboundCallPayload,
  InboundWebhookPayload,
  LandingPageInput,
  ParsedBusinessCard,
} from './capture.types';

function normalizeEmail(email?: string): string | undefined {
  const normalized = email?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function normalizePhone(phone?: string): string | undefined {
  const normalized = phone?.replace(/[^\d+]/g, '').trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function safeString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const firstCurly = text.indexOf('{');
  const lastCurly = text.lastIndexOf('}');
  if (firstCurly === -1 || lastCurly === -1 || firstCurly >= lastCurly) {
    return null;
  }

  try {
    return JSON.parse(text.slice(firstCurly, lastCurly + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseContactFromRawText(rawText: string): ParsedBusinessCard {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const emailMatch = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)?.[0];
  const phoneMatch = rawText.match(/(\+?\d[\d\s().-]{6,}\d)/)?.[0];
  const websiteMatch = rawText.match(/(https?:\/\/\S+|www\.\S+)/i)?.[0];

  const fullName = lines[0];
  const company = lines.length > 2 ? lines[2] : undefined;
  const title = lines.length > 1 ? lines[1] : undefined;

  const firstName = fullName?.split(' ')[0];
  const lastName = fullName?.split(' ').slice(1).join(' ') || undefined;

  return {
    firstName,
    lastName,
    fullName,
    company,
    title,
    email: safeString(emailMatch),
    phone: safeString(phoneMatch),
    website: safeString(websiteMatch),
  };
}

async function parseBusinessCardWithOpenAi(imageDataUrl: string): Promise<ParsedBusinessCard> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new ApiError(400, 'OPENAI_API_KEY is required for image-based business card parsing', 'OPENAI_KEY_REQUIRED');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getOpenAiModel(),
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'Extract business card contact fields and return strict JSON with keys: firstName,lastName,fullName,company,title,email,phone,website.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Parse this business card image and return only JSON.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        },
      ],
      response_format: {
        type: 'json_object',
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(502, 'Business card OCR request failed', 'BUSINESS_CARD_OCR_FAILED', {
      status: response.status,
      body,
    });
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const rawContent = payload.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new ApiError(502, 'Business card OCR returned empty content', 'BUSINESS_CARD_EMPTY');
  }

  const parsed = extractJsonObject(rawContent);
  if (!parsed) {
    throw new ApiError(502, 'Business card OCR returned invalid JSON', 'BUSINESS_CARD_INVALID_JSON');
  }

  return {
    firstName: safeString(parsed.firstName),
    lastName: safeString(parsed.lastName),
    fullName: safeString(parsed.fullName),
    company: safeString(parsed.company),
    title: safeString(parsed.title),
    email: safeString(parsed.email),
    phone: safeString(parsed.phone),
    website: safeString(parsed.website),
  };
}

export class LeadCaptureService {
  async createLead(input: CreateLeadInput) {
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);

    if (!email && !phone) {
      throw new ApiError(400, 'Either email or phone is required to create a lead', 'LEAD_CONTACT_REQUIRED');
    }

    const orConditions: Array<{ email?: string; phone?: string }> = [];
    if (email) orConditions.push({ email });
    if (phone) orConditions.push({ phone });

    const source = await crmDb.leadSource.upsert({
      where: {
        id: `${input.sourceType}:${input.sourceName}`,
      },
      update: {
        name: input.sourceName,
        type: input.sourceType,
      },
      create: {
        id: `${input.sourceType}:${input.sourceName}`,
        name: input.sourceName,
        type: input.sourceType,
      },
    });

    let campaignId: string | undefined;
    if (input.campaignName) {
      const campaign = await crmDb.campaign.upsert({
        where: {
          id: input.campaignName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        },
        update: {
          name: input.campaignName,
          sourceId: source.id,
        },
        create: {
          id: input.campaignName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          name: input.campaignName,
          sourceId: source.id,
          status: 'ACTIVE',
        },
      });
      campaignId = campaign.id;
    }

    const existingLead = orConditions.length > 0
      ? await crmDb.lead.findFirst({
          where: {
            OR: orConditions,
          },
        })
      : null;

    const lead = existingLead
      ? await crmDb.lead.update({
          where: { id: existingLead.id },
          data: {
            firstName: existingLead.firstName || input.firstName,
            lastName: input.lastName ?? existingLead.lastName,
            email: email ?? existingLead.email,
            phone: phone ?? existingLead.phone,
            company: input.company ?? existingLead.company,
            jobTitle: input.jobTitle ?? existingLead.jobTitle,
            timezone: input.timezone ?? existingLead.timezone,
            sourceId: source.id,
            campaignId: campaignId ?? existingLead.campaignId,
            tags: input.tags && input.tags.length > 0 ? input.tags : existingLead.tags,
            metadata: toPrismaJson({
              ...((existingLead.metadata as Record<string, unknown> | null) || {}),
              ...(input.metadata || {}),
            }),
          },
        })
      : await crmDb.lead.create({
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            email,
            phone,
            company: input.company,
            jobTitle: input.jobTitle,
            timezone: input.timezone,
            sourceId: source.id,
            campaignId,
            tags: input.tags || [],
            metadata: toPrismaJson(input.metadata),
          },
        });

    const conversation = await crmDb.conversation.create({
      data: {
        leadId: lead.id,
        channel: input.firstMessageChannel || ChannelType.CHAT,
        source: input.sourceName,
        metadata: toPrismaJson({
          sourceType: input.sourceType,
        }),
      },
    });

    if (input.firstMessage && input.firstMessage.trim().length > 0) {
      await crmDb.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          direction: ConversationDirection.INBOUND,
          channel: input.firstMessageChannel || ChannelType.CHAT,
          content: input.firstMessage.trim(),
        },
      });
    }

    await crmDb.interaction.create({
      data: {
        leadId: lead.id,
        type: existingLead ? 'lead_updated' : 'lead_created',
        channel: input.firstMessageChannel || ChannelType.CHAT,
        payload: toPrismaJson({
          sourceType: input.sourceType,
          sourceName: input.sourceName,
          campaignName: input.campaignName,
        }),
      },
    });

    return lead;
  }

  async listLeads(limit = 50) {
    return crmDb.lead.findMany({
      take: Math.max(1, Math.min(limit, 200)),
      orderBy: { createdAt: 'desc' },
      include: {
        source: true,
        campaign: true,
      },
    });
  }

  async ingestInboundMessage(payload: InboundWebhookPayload) {
    const email = normalizeEmail(payload.lead.email);
    const phone = normalizePhone(payload.lead.phone);

    if (!email && !phone) {
      throw new ApiError(400, 'Inbound payload must include lead email or phone', 'INBOUND_CONTACT_REQUIRED');
    }

    const orConditions: Array<{ email?: string; phone?: string }> = [];
    if (email) orConditions.push({ email });
    if (phone) orConditions.push({ phone });

    let lead = await crmDb.lead.findFirst({
      where: {
        OR: orConditions,
      },
    });

    if (!lead) {
      const source = await crmDb.leadSource.upsert({
        where: {
          id: `${LeadSourceType.IMPORT}:${payload.source}`,
        },
        update: {
          name: payload.source,
          type: LeadSourceType.IMPORT,
        },
        create: {
          id: `${LeadSourceType.IMPORT}:${payload.source}`,
          name: payload.source,
          type: LeadSourceType.IMPORT,
        },
      });

      lead = await crmDb.lead.create({
        data: {
          firstName: payload.lead.firstName || 'Unknown',
          lastName: payload.lead.lastName,
          email,
          phone,
          sourceId: source.id,
        },
      });
    }

    const existingConversation = payload.externalThreadId
      ? await crmDb.conversation.findFirst({
          where: {
            leadId: lead.id,
            externalThreadId: payload.externalThreadId,
          },
        })
      : null;

    const conversation = existingConversation || await crmDb.conversation.create({
      data: {
        leadId: lead.id,
        channel: payload.channel,
        source: payload.source,
        externalThreadId: payload.externalThreadId,
        metadata: toPrismaJson(payload.metadata),
      },
    });

    const message = await crmDb.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        direction: payload.direction === 'OUTBOUND'
          ? ConversationDirection.OUTBOUND
          : ConversationDirection.INBOUND,
        channel: payload.channel,
        content: payload.content,
        metadata: toPrismaJson(payload.metadata),
      },
    });

    await crmDb.interaction.create({
      data: {
        leadId: lead.id,
        type: 'inbound_message',
        channel: payload.channel,
        payload: toPrismaJson(payload.metadata),
      },
    });

    return {
      lead,
      conversation,
      message,
    };
  }

  async logInboundCall(payload: InboundCallPayload) {
    const fromNumber = normalizePhone(payload.fromNumber);
    if (!fromNumber) {
      throw new ApiError(400, 'fromNumber is required', 'CALL_FROM_REQUIRED');
    }

    const lead = await crmDb.lead.findFirst({
      where: {
        phone: fromNumber,
      },
    });

    const call = await crmDb.inboundCall.create({
      data: {
        leadId: lead?.id,
        fromNumber,
        toNumber: normalizePhone(payload.toNumber),
        durationSec: payload.durationSec || 0,
        wasMissed: payload.wasMissed || false,
        campaignId: payload.campaignId,
        metadata: toPrismaJson(payload.metadata),
      },
    });

    if (lead) {
      await crmDb.interaction.create({
        data: {
          leadId: lead.id,
          type: payload.wasMissed ? 'missed_call' : 'inbound_call',
          channel: ChannelType.CALL,
          payload: toPrismaJson({
            callId: call.id,
            durationSec: call.durationSec,
          }),
        },
      });

      if (payload.wasMissed) {
        await enqueueWorkflowEvent({
          triggerType: 'missed_call',
          leadId: lead.id,
          payload: {
            callId: call.id,
            fromNumber,
          },
        });
      }
    }

    return call;
  }

  async saveCaptureForm(input: CaptureFormInput) {
    return crmDb.captureForm.upsert({
      where: {
        slug: input.slug,
      },
      update: {
        name: input.name,
        schemaJson: toPrismaRequiredJson(input.schemaJson),
        isActive: input.isActive ?? true,
      },
      create: {
        name: input.name,
        slug: input.slug,
        schemaJson: toPrismaRequiredJson(input.schemaJson),
        isActive: input.isActive ?? true,
      },
    });
  }

  async listCaptureForms() {
    return crmDb.captureForm.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getActiveCaptureFormBySlug(slug: string) {
    return crmDb.captureForm.findFirst({
      where: {
        slug,
        isActive: true,
      },
    });
  }

  async saveLandingPage(input: LandingPageInput) {
    return crmDb.landingPage.upsert({
      where: {
        slug: input.slug,
      },
      update: {
        name: input.name,
        configJson: toPrismaRequiredJson(input.configJson),
        isPublished: input.isPublished ?? false,
      },
      create: {
        name: input.name,
        slug: input.slug,
        configJson: toPrismaRequiredJson(input.configJson),
        isPublished: input.isPublished ?? false,
      },
    });
  }

  async listLandingPages() {
    return crmDb.landingPage.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async generateQrForForm(formSlug: string, campaignId?: string) {
    const baseUrl = process.env.CRM_PUBLIC_BASE_URL || 'http://localhost:3000';
    const url = new URL('/crm/capture', baseUrl);
    url.searchParams.set('form', formSlug);
    if (campaignId) {
      url.searchParams.set('campaign', campaignId);
    }

    const qrDataUrl = await QRCode.toDataURL(url.toString(), {
      width: 320,
      margin: 1,
    });

    return {
      url: url.toString(),
      qrDataUrl,
    };
  }

  async scanBusinessCard(input: BusinessCardScanInput): Promise<ParsedBusinessCard> {
    if (input.imageDataUrl && input.imageDataUrl.startsWith('data:image/')) {
      return parseBusinessCardWithOpenAi(input.imageDataUrl);
    }

    if (input.rawText && input.rawText.trim().length > 0) {
      return parseContactFromRawText(input.rawText);
    }

    throw new ApiError(
      400,
      'Provide imageDataUrl (for AI OCR) or rawText (for parser fallback)',
      'BUSINESS_CARD_INPUT_REQUIRED'
    );
  }

  async createLeadFromBusinessCard(input: BusinessCardScanInput): Promise<Lead> {
    const parsed = await this.scanBusinessCard(input);

    const firstName = parsed.firstName || parsed.fullName?.split(' ')[0] || 'Unknown';
    const lastName = parsed.lastName || parsed.fullName?.split(' ').slice(1).join(' ') || undefined;

    return this.createLead({
      firstName,
      lastName,
      email: parsed.email,
      phone: parsed.phone,
      company: parsed.company,
      jobTitle: parsed.title,
      sourceType: LeadSourceType.BUSINESS_CARD,
      sourceName: 'business-card-scan',
      firstMessage: 'Lead captured from business card scan',
      firstMessageChannel: ChannelType.SYSTEM,
    });
  }
}
