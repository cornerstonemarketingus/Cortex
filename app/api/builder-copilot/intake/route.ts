import { NextResponse } from 'next/server';
import { buildProvisioning, type CommunicationProvider } from '@/lib/communications/core';

type IntakeBody = {
  businessName?: string;
  websiteUrl?: string;
  phoneNumber?: string;
  email?: string;
  context?: string;
  provider?: CommunicationProvider;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as IntakeBody;
    const businessName = (body.businessName || '').trim();
    const websiteUrl = (body.websiteUrl || '').trim();
    const phoneNumber = (body.phoneNumber || '').trim();
    const email = (body.email || '').trim();
    const context = (body.context || 'general').trim();

    if (!businessName && !websiteUrl && !phoneNumber) {
      return NextResponse.json({ error: 'Provide at least a business name, website URL, or phone number.' }, { status: 400 });
    }

    const provisioning = buildProvisioning({
      businessName,
      websiteUrl,
      phoneNumber,
      email,
      provider: body.provider,
    });

    const businessBoosterPlan = [
      'Generate a high-converting landing page with one core CTA and one estimate form.',
      'Publish NAP-consistent business listings to major directories and track completion weekly.',
      'Set up Google Business Profile categories, services, and photo cadence.',
      'Run SEO/GEO pass: title tags, service schema, local service area pages, and internal link hubs.',
      'Deploy review-request automation after estimate and after completed job milestones.',
    ];

    return NextResponse.json({
      summary: `${provisioning.summary}${email ? ` Contact: ${email}.` : ''} Source: ${context}.`,
      chatbotSnippet: provisioning.chatbotSnippet,
      voiceReceptionistPlan: provisioning.voiceReceptionistPlan,
      hostingOffer: provisioning.hostingOffer,
      tokenRecommendation: provisioning.tokenRecommendation,
      businessBoosterPlan,
    });
  } catch {
    return NextResponse.json({ error: 'Unable to process Builder Copilot intake.' }, { status: 500 });
  }
}
