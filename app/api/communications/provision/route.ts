import { NextResponse } from 'next/server';
import { buildProvisioning, type CommunicationProvider } from '@/lib/communications/core';

type ProvisionBody = {
  businessName?: string;
  websiteUrl?: string;
  phoneNumber?: string;
  email?: string;
  provider?: CommunicationProvider;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as ProvisionBody;

    if (!body.businessName && !body.websiteUrl && !body.phoneNumber) {
      return NextResponse.json({ error: 'Provide a business name, website URL, or phone number.' }, { status: 400 });
    }

    const provisioning = buildProvisioning(body);
    return NextResponse.json({ provisioning });
  } catch {
    return NextResponse.json({ error: 'Unable to generate communications provisioning.' }, { status: 500 });
  }
}
