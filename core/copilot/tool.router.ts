// Tool router - directs intents to appropriate handlers
import { type ClassificationResult, type Intent } from './intent.classifier';
import engine, { type EstimateInput } from '@/lib/estimator/engine';

export interface ToolResult {
  type: Intent;
  success: boolean;
  data?: any;
  message: string;
  error?: string;
}

interface ContextData {
  lastEstimate?: any;
  lastIntent?: Intent;
  history: Array<{ input: string; intent: Intent }>;
}

// Estimator tool
async function estimatorTool(
  input: string,
  entities: ClassificationResult['entities'],
  context: ContextData
): Promise<ToolResult> {
  try {
    const sqft = entities.sqft || 1000;
    const projectType = entities.projectType || 'general';

    const estimateInput: EstimateInput = {
      materials: [
        {
          name: 'Materials',
          quantity: sqft,
          unit: 'sqft',
          unitCost: 2.5,
        },
      ],
      labor: [
        {
          trade: 'Labor',
          hours: sqft * 0.02,
          hourlyRate: 55,
        },
      ],
      multipliers: {
        overheadRate: 0.12,
        taxRate: 0.07,
        profitMarginRate: 0.12,
        locationFactor: 1.0,
        complexityFactor: 1.05,
      },
    };

    const breakdown = engine.calculateEstimate(estimateInput);

    return {
      type: 'estimate',
      success: true,
      data: {
        breakdown,
        projectType,
        sqft,
        description: input,
      },
      message: `Estimate calculated: $${breakdown.total.toFixed(2)}`,
    };
  } catch (error) {
    return {
      type: 'estimate',
      success: false,
      message: 'Estimate calculation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Builder tool
async function builderTool(
  input: string,
  entities: ClassificationResult['entities'],
  context: ContextData
): Promise<ToolResult> {
  return {
    type: 'builder',
    success: true,
    data: {
      action: entities.action || 'create_page',
      description: input,
    },
    message: 'Site builder mode activated. Describe the page you want to create.',
  };
}

// Automation tool
async function automationTool(
  input: string,
  entities: ClassificationResult['entities'],
  context: ContextData
): Promise<ToolResult> {
  return {
    type: 'automation',
    success: true,
    data: {
      action: entities.action || 'create_workflow',
      description: input,
    },
    message: 'Automation builder ready. Describe your workflow.',
  };
}

// Chat tool (default fallback)
async function chatTool(
  input: string,
  context: ContextData
): Promise<ToolResult> {
  return {
    type: 'chat',
    success: true,
    message: input,
    data: { type: 'chat' },
  };
}

// Main router function
export async function routeIntent(
  classification: ClassificationResult,
  input: string,
  context: ContextData
): Promise<ToolResult> {
  const { intent, entities } = classification;

  switch (intent) {
    case 'estimate':
      return await estimatorTool(input, entities, context);

    case 'builder':
      return await builderTool(input, entities, context);

    case 'automation':
      return await automationTool(input, entities, context);

    case 'chat':
    default:
      return await chatTool(input, context);
  }
}

export default { routeIntent };
