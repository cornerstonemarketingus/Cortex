// Context store - manages conversation state and history
import { type Intent } from './intent.classifier';

export interface ContextMessage {
  id: string;
  intent: Intent;
  input: string;
  timestamp: number;
}

export interface CopilotContext {
  sessionId: string;
  history: ContextMessage[];
  lastIntent?: Intent;
  lastEstimate?: any;
  lastBuilder?: any;
  lastAutomation?: any;
  metadata?: {
    [key: string]: any;
  };
}

const STORAGE_KEY = 'copilot.context.v1';

export function createContext(sessionId: string = Date.now().toString()): CopilotContext {
  return {
    sessionId,
    history: [],
    metadata: {},
  };
}

export function loadContextFromStorage(): CopilotContext {
  if (typeof window === 'undefined') {
    return createContext();
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return createContext();

    const parsed = JSON.parse(stored) as CopilotContext;
    return parsed;
  } catch {
    return createContext();
  }
}

export function saveContextToStorage(context: CopilotContext): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch {
    console.warn('Failed to save context to storage');
  }
}

export function addMessageToContext(
  context: CopilotContext,
  input: string,
  intent: Intent
): CopilotContext {
  return {
    ...context,
    history: [
      ...context.history,
      {
        id: `msg-${Date.now()}`,
        intent,
        input,
        timestamp: Date.now(),
      },
    ].slice(-50), // Keep last 50 messages
    lastIntent: intent,
  };
}

export function updateContextData(
  context: CopilotContext,
  intent: Intent,
  data: any
): CopilotContext {
  const updated = { ...context };

  switch (intent) {
    case 'estimate':
      updated.lastEstimate = data;
      break;
    case 'builder':
      updated.lastBuilder = data;
      break;
    case 'automation':
      updated.lastAutomation = data;
      break;
  }

  return updated;
}

export function getContextSummary(context: CopilotContext): string {
  const intents = context.history.slice(-10).map((m) => m.intent);
  const uniqueIntents = [...new Set(intents)];

  return `Session: ${context.sessionId} | Recent intents: ${uniqueIntents.join(', ')} | History: ${context.history.length} messages`;
}

export default {
  createContext,
  loadContextFromStorage,
  saveContextToStorage,
  addMessageToContext,
  updateContextData,
  getContextSummary,
};
