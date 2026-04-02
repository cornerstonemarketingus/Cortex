/**
 * Copilot Context Engine
 * Manages per-session app context, builds intelligent prompts,
 * and tracks what pages/data the user is working on.
 */

export type UserRole = 'contractor' | 'homeowner' | 'admin' | 'guest';
export type ActivePage =
  | 'estimator'
  | 'builder'
  | 'crm'
  | 'automations'
  | 'voice'
  | 'dashboard'
  | 'settings';

export interface ProjectData {
  projectType?: string;
  squareFeet?: number;
  location?: string;
  materials?: Array<{ name: string; cost: number }>;
  labor?: { hours: number; rate: number };
  margin?: number;
  clientName?: string;
}

export interface UIState {
  activeSections?: string[];
  selectedComponent?: string;
  editingField?: string;
  builderPageSlug?: string;
}

export interface CopilotContext {
  user: UserRole;
  businessType?: string;
  activePage: ActivePage;
  projectData?: ProjectData;
  uiState?: UIState;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  sessionId?: string;
}

/**
 * Build a rich, context-aware system prompt for the copilot.
 */
export function buildSystemPrompt(ctx: CopilotContext): string {
  const parts: string[] = [
    'You are the CORTEX AI Copilot — an expert construction business assistant.',
    `User role: ${ctx.user}`,
  ];

  if (ctx.businessType) parts.push(`Business type: ${ctx.businessType}`);
  parts.push(`Active page: ${ctx.activePage}`);

  if (ctx.projectData) {
    const pd = ctx.projectData;
    if (pd.projectType) parts.push(`Current project: ${pd.projectType}`);
    if (pd.squareFeet) parts.push(`Square footage: ${pd.squareFeet} sqft`);
    if (pd.location) parts.push(`Location: ${pd.location}`);
    if (pd.clientName) parts.push(`Client: ${pd.clientName}`);
  }

  if (ctx.uiState?.builderPageSlug) {
    parts.push(`Builder page: ${ctx.uiState.builderPageSlug}`);
  }

  parts.push('');
  parts.push(
    'Respond with structured JSON when performing actions. Available actions:',
    '- CREATE_ESTIMATE: Generate estimate JSON with materials, labor, margin',
    '- UPDATE_BUILDER: Return a page section object to inject into the builder',
    '- CREATE_AUTOMATION: Return a workflow trigger/action spec',
    '- EXPLAIN: Return plain text explanation',
    '- NOOP: Return only a helpful text response',
  );

  parts.push('');
  parts.push(
    'Response format: { "text": string, "action": { "type": ACTION_TYPE, "payload": object|null } }',
  );

  return parts.join('\n');
}

/**
 * Build a user-facing prompt from intent + context.
 */
export function buildPrompt(ctx: CopilotContext, intent: string): string {
  const contextHints: string[] = [];

  if (ctx.activePage === 'estimator' && ctx.projectData?.projectType) {
    contextHints.push(`Current estimate type: ${ctx.projectData.projectType}`);
  }

  if (ctx.activePage === 'builder' && ctx.uiState?.builderPageSlug) {
    contextHints.push(`Builder page: ${ctx.uiState.builderPageSlug}`);
  }

  if (contextHints.length > 0) {
    return `Context:\n${contextHints.join('\n')}\n\nTask: ${intent}`;
  }

  return intent;
}

/**
 * Merge partial context update into existing context.
 */
export function mergeContext(base: CopilotContext, update: Partial<CopilotContext>): CopilotContext {
  return {
    ...base,
    ...update,
    projectData: update.projectData ? { ...base.projectData, ...update.projectData } : base.projectData,
    uiState: update.uiState ? { ...base.uiState, ...update.uiState } : base.uiState,
  };
}

/**
 * Default context for a new session.
 */
export function defaultContext(overrides?: Partial<CopilotContext>): CopilotContext {
  return {
    user: 'contractor',
    activePage: 'dashboard',
    conversationHistory: [],
    ...overrides,
  };
}
