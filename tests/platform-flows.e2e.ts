type TestEnv = {
  baseUrl: string;
  token: string;
  tenantId: string;
  subscriberEmail: string;
  phone: string;
  webhookSecret?: string;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value.trim();
}

function loadEnv(): TestEnv {
  return {
    baseUrl: (process.env.PLATFORM_E2E_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, ''),
    token: required('PLATFORM_E2E_TOKEN'),
    tenantId: required('PLATFORM_E2E_TENANT_ID'),
    subscriberEmail: required('PLATFORM_E2E_SUBSCRIBER_EMAIL'),
    phone: required('PLATFORM_E2E_TEST_PHONE'),
    webhookSecret: process.env.CRM_TWILIO_WEBHOOK_SECRET?.trim() || undefined,
  };
}

async function httpJson<T>(
  env: TestEnv,
  path: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  }
): Promise<{ status: number; json: T }> {
  const response = await fetch(`${env.baseUrl}${path}`, {
    method: options?.method || 'GET',
    headers: {
      Authorization: `Bearer ${env.token}`,
      'Content-Type': 'application/json',
      'x-tenant-id': env.tenantId,
      ...(options?.headers || {}),
    },
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const json = (await response.json().catch(() => ({}))) as T;
  return { status: response.status, json };
}

function assertOk(status: number, context: string) {
  if (status < 200 || status >= 300) {
    throw new Error(`${context} failed with status ${status}`);
  }
}

async function runSmsOutInFlow(env: TestEnv) {
  const send = await httpJson<{
    leadId: string;
    messageId: string;
    tenantId: string;
  }>(env, '/api/sms/send', {
    method: 'POST',
    body: {
      tenantId: env.tenantId,
      phone: env.phone,
      firstName: 'E2E SMS',
      content: 'Platform E2E outbound test.',
      source: 'platform-e2e',
      provider: 'mock',
    },
  });

  assertOk(send.status, 'SMS send');

  const params = new URLSearchParams({
    leadId: send.json.leadId,
    messageId: send.json.messageId,
    tenantId: env.tenantId,
  });
  if (env.webhookSecret) {
    params.set('secret', env.webhookSecret);
  }

  const form = new FormData();
  form.set('MessageSid', `SM-E2E-${Date.now()}`);
  form.set('MessageStatus', 'received');
  form.set('From', env.phone);
  form.set('To', '+10000000000');
  form.set('Body', 'Inbound e2e webhook message');

  const inbound = await fetch(`${env.baseUrl}/api/sms/webhook?${params.toString()}`, {
    method: 'POST',
    headers: {
      ...(env.webhookSecret ? { 'x-crm-webhook-secret': env.webhookSecret } : {}),
    },
    body: form,
  });

  assertOk(inbound.status, 'SMS webhook inbound');

  return send.json.leadId;
}

async function runOrchestrationAndApprovalFlow(env: TestEnv) {
  const orchestration = await httpJson<{
    lead: { id: string };
    approval: { id: string };
    tenantId: string;
  }>(env, '/api/platform/orchestrate', {
    method: 'POST',
    body: {
      tenantId: env.tenantId,
      subscriberEmail: env.subscriberEmail,
      objective: 'Follow up and schedule a site assessment for this lead.',
      firstName: 'E2E Orchestrated',
      email: `orchestrated+${Date.now()}@example.com`,
      sourceName: 'platform-e2e',
    },
  });

  assertOk(orchestration.status, 'Platform orchestrate');

  const approval = await httpJson<{ approval: { id: string } }>(env, '/api/platform/approvals', {
    method: 'POST',
    body: {
      tenantId: env.tenantId,
      leadId: orchestration.json.lead.id,
      title: 'E2E approval transition check',
      payload: { source: 'platform-e2e' },
      reviewerRoles: ['admin'],
      slaMinutes: 20,
      escalationChain: [
        { role: 'agent', afterMinutes: 10 },
        { role: 'admin', afterMinutes: 20 },
      ],
    },
  });

  assertOk(approval.status, 'Platform approvals create');

  const transition = await httpJson<{ approval: { payload?: { status?: string } } }>(env, '/api/platform/approvals', {
    method: 'PATCH',
    body: {
      tenantId: env.tenantId,
      approvalId: approval.json.approval.id,
      action: 'approve',
      reviewerNote: 'Approved in e2e path',
    },
  });

  assertOk(transition.status, 'Platform approvals patch');
}

async function runGrowthFlow(env: TestEnv) {
  const growth = await httpJson<{ ok: boolean; tenantId: string }>(env, '/api/platform/growth', {
    method: 'POST',
    body: {
      tenantId: env.tenantId,
      subscriberEmail: env.subscriberEmail,
      topic: 'E2E geo growth content automation test',
      region: 'north-america',
      cityFocus: 'Minneapolis,St Paul',
      improveCommunication: true,
      enqueueDevTasks: false,
    },
  });

  assertOk(growth.status, 'Platform growth');
}

async function main() {
  const env = loadEnv();

  console.log('[e2e] Starting platform flow test suite...');
  const leadId = await runSmsOutInFlow(env);
  console.log(`[e2e] SMS out/in flow passed for lead ${leadId}`);

  await runOrchestrationAndApprovalFlow(env);
  console.log('[e2e] Orchestration + approval flow passed');

  await runGrowthFlow(env);
  console.log('[e2e] Growth flow passed');

  console.log('[e2e] All platform flow tests passed');
}

main().catch((error) => {
  console.error('[e2e] Platform flow tests failed');
  console.error(error);
  process.exit(1);
});
