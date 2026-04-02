import { NextRequest, NextResponse } from 'next/server';
import { processVoiceCall, buildTwiML, type VoiceAgentConfig } from '@/lib/communications/voice-agent';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') ?? '';

    let payload: Record<string, string>;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Twilio sends form-encoded webhooks
      const text = await req.text();
      payload = Object.fromEntries(new URLSearchParams(text));
    } else {
      payload = await req.json();
    }

    const config: VoiceAgentConfig = {
      businessName: process.env.BUSINESS_NAME ?? 'Cortex Contractor Services',
      businessType: process.env.BUSINESS_TYPE ?? 'general-contractor',
      customGreeting: process.env.VOICE_GREETING,
    };

    const voicePayload = {
      callSid: payload.CallSid ?? payload.callSid ?? '',
      from: payload.From ?? payload.from ?? '',
      to: payload.To ?? payload.to ?? '',
      callerInput: payload.SpeechResult ?? payload.callerInput ?? '',
      callStatus: payload.CallStatus ?? payload.callStatus ?? 'in-progress',
    };

    const response = await processVoiceCall(voicePayload, config);

    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Return TwiML for Twilio
      const twiml = buildTwiML(response);
      return new Response(twiml, {
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error('[/api/voice/agent]', err);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>We're sorry, we're experiencing technical difficulties. Please call back shortly.</Say><Hangup/></Response>`;
    return new Response(errorTwiml, { headers: { 'Content-Type': 'application/xml' }, status: 200 });
  }
}

// Twilio status callback
export async function GET(req: NextRequest) {
  return NextResponse.json({ status: 'Voice agent active' });
}
