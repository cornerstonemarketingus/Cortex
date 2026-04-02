/**
 * AI Voice Agent
 * Control layer over SIP/telephony providers (Telnyx, Twilio, SignalWire).
 * Implements the full: Transcribe → LLM decides → TTS → Respond loop.
 * Does NOT reinvent telecom — orchestrates existing carrier APIs.
 */

import { llm } from '@/lib/llm/router';

export type VoiceProvider = 'twilio' | 'telnyx' | 'signalwire';

export interface InboundCallPayload {
  callSid: string;
  from: string;
  to: string;
  transcription?: string;
  recordingUrl?: string;
  provider?: VoiceProvider;
}

export interface VoiceAgentResponse {
  speak: string;          // TTS text to speak back
  action: 'hangup' | 'continue' | 'transfer' | 'voicemail';
  transferTo?: string;    // phone number for transfer
  recordingEnabled?: boolean;
}

export interface SMSMessage {
  to: string;
  from?: string;
  body: string;
  mediaUrl?: string;
}

export interface VoiceAgentConfig {
  businessName: string;
  businessType?: string;
  receptionistName?: string;
  transferNumber?: string;
  timezone?: string;
  workingHours?: { start: number; end: number };  // 24h format
  customGreeting?: string;
}

const DEFAULT_CONFIG: VoiceAgentConfig = {
  businessName: 'CORTEX',
  businessType: 'construction contractor',
  receptionistName: 'Alex',
  timezone: 'America/Chicago',
};

/**
 * Build the AI voice receptionist system prompt.
 */
function buildReceptionistPrompt(config: VoiceAgentConfig, callerInput: string): string {
  const name = config.receptionistName || 'Alex';
  const biz = config.businessName;
  const type = config.businessType || 'business';

  return `You are ${name}, an AI voice receptionist for ${biz}, a ${type}.

Your job:
1. Greet callers professionally and warmly
2. Understand why they are calling (estimate, appointment, question, emergency)
3. Collect their name and contact info if not provided
4. For estimate requests: ask for project type, address, and scope
5. For appointments: check availability and offer slots
6. For emergencies: offer to transfer to a live person immediately

Keep responses SHORT (under 30 words) — this is a phone call.
Do not use bullet points or markdown. Speak naturally.

Respond with JSON: { "speak": string, "action": "continue|hangup|transfer|voicemail", "transferTo": string|null }

Caller said: "${callerInput}"`;
}

/**
 * Process an inbound call via the AI voice agent.
 * Returns what to say and what action to take.
 */
export async function processVoiceCall(
  payload: InboundCallPayload,
  config: Partial<VoiceAgentConfig> = {}
): Promise<VoiceAgentResponse> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const input = payload.transcription || 'Hello';

  try {
    const raw = await llm(buildReceptionistPrompt(cfg, input), 'voice');

    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        speak: parsed.speak || defaultGreeting(cfg),
        action: parsed.action || 'continue',
        transferTo: parsed.transferTo || cfg.transferNumber,
        recordingEnabled: true,
      };
    }

    // Fallback: use raw text as speech
    return {
      speak: raw.length < 200 ? raw : defaultGreeting(cfg),
      action: 'continue',
      recordingEnabled: true,
    };
  } catch {
    return {
      speak: defaultGreeting(cfg),
      action: 'continue',
      recordingEnabled: true,
    };
  }
}

function defaultGreeting(config: VoiceAgentConfig): string {
  const g = config.customGreeting;
  if (g) return g;
  const name = config.receptionistName || 'an AI assistant';
  return `Thank you for calling ${config.businessName}. I'm ${name}. How can I help you today?`;
}

/**
 * Summarize a call transcript using AI.
 * Returns key points: caller intent, info collected, follow-up needed.
 */
export async function summarizeCallTranscript(transcript: string, businessName: string): Promise<{
  summary: string;
  callerIntent: string;
  followUpRequired: boolean;
  estimateRequested: boolean;
  appointmentRequested: boolean;
}> {
  const prompt = `You are summarizing a phone call for ${businessName}.

Transcript:
${transcript}

Respond with JSON: {
  "summary": "2-3 sentence summary",
  "callerIntent": "estimate|appointment|question|complaint|other",
  "followUpRequired": boolean,
  "estimateRequested": boolean,
  "appointmentRequested": boolean
}`;

  try {
    const raw = await llm(prompt, 'reasoning');
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {
    // ignore
  }

  return {
    summary: transcript.slice(0, 200),
    callerIntent: 'other',
    followUpRequired: true,
    estimateRequested: false,
    appointmentRequested: false,
  };
}

/**
 * Generate a Twilio TwiML response string.
 * Used in /api/crm/nurture/voice and /api/voice/* endpoints.
 */
export function buildTwiML(response: VoiceAgentResponse): string {
  const twiml: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<Response>'];

  if (response.recordingEnabled) {
    twiml.push('  <Record maxLength="120" playBeep="false" />');
  }

  twiml.push(`  <Say voice="Polly.Joanna">${escapeXml(response.speak)}</Say>`);

  if (response.action === 'transfer' && response.transferTo) {
    twiml.push(`  <Dial>${escapeXml(response.transferTo)}</Dial>`);
  } else if (response.action === 'hangup') {
    twiml.push('  <Hangup/>');
  } else if (response.action === 'voicemail') {
    twiml.push('  <Record action="/api/crm/nurture/voice/voicemail" maxLength="120" />');
  }

  twiml.push('</Response>');
  return twiml.join('\n');
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Generate AI-personalized SMS message for follow-up.
 */
export async function generateSMSFollowUp(
  context: { callerName?: string; intent: string; businessName: string; projectType?: string }
): Promise<string> {
  const prompt = `Write a short, friendly SMS follow-up message for a contractor business.
Business: ${context.businessName}
Caller: ${context.callerName || 'a potential customer'}
Intent: ${context.intent}
${context.projectType ? `Project: ${context.projectType}` : ''}

Keep it under 160 characters. Be warm and professional. Include a call to action.`;

  const text = await llm(prompt, 'chat');
  return text.slice(0, 160);
}
