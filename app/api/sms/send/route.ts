import { ChannelType, LeadSourceType } from '@/generated/crm-client';
import { ApiError, readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { LeadCaptureService } from '@/src/crm/modules/capture';
import { NurtureService } from '@/src/crm/modules/nurture';
import { requireTenantContext } from '@/src/platform/tenant-enforcement';

type SendBody = {
  phone?: unknown;
  content?: unknown;
  firstName?: unknown;
  source?: unknown;
  tenantId?: unknown;
  provider?: unknown;
};

const captureService = new LeadCaptureService();
const nurtureService = new NurtureService();

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const auth = await requireCrmAuth(request);
    const body = await readJson<SendBody>(request);
    const tenant = requireTenantContext(request, {
      claims: auth,
      bodyTenantId: body.tenantId,
      required: true,
    });

    const phone = parseOptionalString(body.phone);
    const content = parseOptionalString(body.content);
    const provider = parseOptionalString(body.provider) || 'default';

    if (!phone || !content) {
      throw new ApiError(400, 'phone and content are required', 'SMS_INPUT_REQUIRED');
    }

    const lead = await captureService.createLead({
      firstName: parseOptionalString(body.firstName) || 'SMS Lead',
      phone,
      sourceType: LeadSourceType.MANUAL,
      sourceName: parseOptionalString(body.source) || 'sms-send-api',
      firstMessage: content,
      firstMessageChannel: ChannelType.SMS,
      tags: ['sms-automation'],
      metadata: {
        tenantId: tenant.tenantId,
        smsProviderRequest: provider,
      },
    });

    const sent = await nurtureService.sendMessage({
      leadId: lead.id,
      channel: ChannelType.SMS,
      content,
      source: `${parseOptionalString(body.source) || 'sms-send-api'}:${provider}`,
      autoReply: false,
    });

    return jsonResponse({
      tenantId: tenant.tenantId,
      leadId: lead.id,
      messageId: sent.outbound.id,
      delivery: sent.delivery,
    }, 201);
  });
}
