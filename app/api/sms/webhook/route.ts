import { ChannelType } from '@/generated/crm-client';
import { POST as handleTwilioWebhook } from '@/app/api/crm/nurture/webhooks/twilio/route';
import { ApiError, readJson } from '@/src/crm/core/api';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { LeadCaptureService } from '@/src/crm/modules/capture';

type GenericWebhookBody = {
	provider?: unknown;
	from?: unknown;
	to?: unknown;
	body?: unknown;
	leadId?: unknown;
	status?: unknown;
	messageId?: unknown;
	tenantId?: unknown;
};

const captureService = new LeadCaptureService();

export async function POST(request: Request) {
	const providerFromQuery = parseOptionalString(new URL(request.url).searchParams.get('provider'));
	const providerFromHeader = parseOptionalString(request.headers.get('x-sms-provider') || undefined);
	const provider = (providerFromQuery || providerFromHeader || 'twilio').toLowerCase();
	const contentType = request.headers.get('content-type') || '';

	if (provider === 'twilio' || contentType.includes('application/x-www-form-urlencoded')) {
		return handleTwilioWebhook(request);
	}

	return withApiHandler(async () => {
		const body = await readJson<GenericWebhookBody>(request);
		const from = parseOptionalString(body.from);
		const messageBody = parseOptionalString(body.body);

		if (!from || !messageBody) {
			throw new ApiError(400, 'from and body are required for generic SMS webhook payload', 'SMS_WEBHOOK_INPUT_REQUIRED');
		}

		const ingested = await captureService.ingestInboundMessage({
			source: `${provider}-sms`,
			channel: ChannelType.SMS,
			direction: 'INBOUND',
			externalThreadId: parseOptionalString(body.messageId),
			lead: {
				firstName: 'Inbound',
				phone: from,
			},
			content: messageBody,
			metadata: {
				provider,
				to: parseOptionalString(body.to),
				status: parseOptionalString(body.status) || 'received',
				tenantId: parseOptionalString(body.tenantId),
			},
		});

		return jsonResponse({
			ok: true,
			provider,
			leadId: ingested.lead.id,
			conversationId: ingested.conversation.id,
			messageId: ingested.message.id,
		});
	});
}
