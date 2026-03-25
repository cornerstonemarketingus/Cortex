export type CommunicationProvider = 'twilio' | 'cortex-voice-core';

export type TokenPlan = {
  id: string;
  name: string;
  tokens: number;
  priceUsd: number;
  notes: string;
};

export const TOKEN_PLANS: TokenPlan[] = [
  {
    id: 'starter-10k',
    name: 'Starter 10K',
    tokens: 10_000,
    priceUsd: 99,
    notes: 'Early-stage usage for voice receptionist + chatbot on low traffic.',
  },
  {
    id: 'growth-50k',
    name: 'Growth 50K',
    tokens: 50_000,
    priceUsd: 399,
    notes: 'Recommended for active contractor funnels and multi-channel follow-up.',
  },
  {
    id: 'scale-250k',
    name: 'Scale 250K',
    tokens: 250_000,
    priceUsd: 1499,
    notes: 'High-volume voice + chat operations with automation bursts.',
  },
];

export type ProvisioningInput = {
  businessName?: string;
  websiteUrl?: string;
  phoneNumber?: string;
  email?: string;
  provider?: CommunicationProvider;
};

export type ProvisioningOutput = {
  provider: CommunicationProvider;
  summary: string;
  voiceReceptionistPlan: string[];
  chatbotSnippet: string;
  hostingOffer: string[];
  tokenRecommendation: TokenPlan;
};

function normalizeUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

export function recommendTokenPlan(leadVolumeHint: 'low' | 'medium' | 'high' = 'medium'): TokenPlan {
  if (leadVolumeHint === 'low') return TOKEN_PLANS[0];
  if (leadVolumeHint === 'high') return TOKEN_PLANS[2];
  return TOKEN_PLANS[1];
}

export function buildProvisioning(input: ProvisioningInput): ProvisioningOutput {
  const businessName = (input.businessName || 'your business').trim();
  const websiteUrl = normalizeUrl((input.websiteUrl || '').trim());
  const phoneNumber = (input.phoneNumber || '').trim();
  const provider = input.provider || 'twilio';

  const tokenRecommendation = recommendTokenPlan(phoneNumber && websiteUrl ? 'high' : websiteUrl || phoneNumber ? 'medium' : 'low');

  const chatbotSnippet = websiteUrl
    ? [
        '<script>',
        '  window.CORTEX_CHATBOT = {',
        `    business: ${JSON.stringify(businessName)},`,
        `    website: ${JSON.stringify(websiteUrl)},`,
        '    provider: "cortex-chat-core",',
        '    mode: "lead-capture-and-qualification"',
        '  };',
        '  (function(){',
        '    const s = document.createElement("script");',
        '    s.src = "https://cdn.cortexengine.app/chatbot/widget.js";',
        '    s.defer = true;',
        '    document.head.appendChild(s);',
        '  })();',
        '</script>',
      ].join('\n')
    : '';

  const voiceReceptionistPlan = [
    provider === 'twilio'
      ? 'Connect your Twilio number and route inbound/missed calls into Cortex voice webhook orchestration.'
      : 'Provision a Cortex Voice Core number and route inbound/missed calls directly to Cortex voice orchestration.',
    phoneNumber
      ? `Configure forwarding from ${phoneNumber} to the AI receptionist endpoint for missed-call text-back.`
      : 'Attach your business phone number to the AI receptionist endpoint for voicemail and follow-up.',
    'Enable transcript summarization to CRM with /api/crm/nurture/voice for qualification and next-step automation.',
  ];

  const hostingOffer = [
    'Host your website on Cortex managed hosting with auth, forms, and analytics built in.',
    'Use one-click domain connection and managed SSL from the Cortex launch pipeline.',
    'Deploy chatbot, CRM capture, and conversion tracking without third-party plugin setup.',
  ];

  return {
    provider,
    summary: `Provisioning package prepared for ${businessName}. Includes voice receptionist, website chatbot, managed hosting, and tokenized usage billing.`,
    voiceReceptionistPlan,
    chatbotSnippet,
    hostingOffer,
    tokenRecommendation,
  };
}
