// Main copilot service - orchestrates intent classification, routing, and context
import { classifyIntent, type ClassificationResult, type Intent } from './intent.classifier';
import { routeIntent, type ToolResult } from './tool.router';
import {
  type CopilotContext,
  addMessageToContext,
  updateContextData,
  saveContextToStorage,
} from './context.store';

export interface CopilotResponse {
  input: string;
  classification: ClassificationResult;
  toolResult: ToolResult;
  context: CopilotContext;
  response: string;
}

export async function handleCopilotRequest(
  input: string,
  context: CopilotContext
): Promise<CopilotResponse> {
  try {
    // Step 1: Classify intent
    const classification = await classifyIntent(input);

    // Step 2: Route to appropriate tool
    const toolResult = await routeIntent(
      classification,
      input,
      {
        lastEstimate: context.lastEstimate,
        lastIntent: context.lastIntent,
        history: context.history.map((m) => ({ input: m.input, intent: m.intent })),
      }
    );

    // Step 3: Update context
    let updatedContext = addMessageToContext(context, input, classification.intent);
    if (toolResult.data) {
      updatedContext = updateContextData(updatedContext, classification.intent, toolResult.data);
    }

    // Step 4: Save context
    saveContextToStorage(updatedContext);

    // Step 5: Build response message
    const response = buildResponseMessage(
      classification.intent,
      toolResult,
      classification.confidence
    );

    return {
      input,
      classification,
      toolResult,
      context: updatedContext,
      response,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const fallbackContext = addMessageToContext(context, input, 'chat');
    saveContextToStorage(fallbackContext);

    return {
      input,
      classification: {
        intent: 'chat',
        confidence: 0,
        entities: {},
        rawText: input,
      },
      toolResult: {
        type: 'chat',
        success: false,
        message: `Error: ${errorMessage}`,
        error: errorMessage,
      },
      context: fallbackContext,
      response: `I encountered an error: ${errorMessage}. Please try again.`,
    };
  }
}

function buildResponseMessage(intent: Intent, result: ToolResult, confidence: number): string {
  const confidenceNote = confidence < 0.7 ? ' (low confidence)' : '';

  switch (intent) {
    case 'estimate':
      if (result.success && result.data?.breakdown) {
        const total = result.data.breakdown.total.toFixed(2);
        return `**Estimate: $${total}**${confidenceNote}\n\nMaterials: $${result.data.breakdown.materialsTotal.toFixed(2)}\nLabor: $${result.data.breakdown.laborTotal.toFixed(2)}\nOverhead/Tax/Profit: $${(result.data.breakdown.overheadAmount + result.data.breakdown.taxAmount + result.data.breakdown.profitAmount).toFixed(2)}`;
      }
      return `I'm ready to estimate your project${confidenceNote}. Could you provide more details (square footage, location)?`;

    case 'builder':
      return `**Site Builder Mode**${confidenceNote}\n\nI can help you create or edit your website. What would you like to build?\n- Hero section\n- Services page\n- Landing page\n- Custom section`;

    case 'automation':
      return `**Automation Builder**${confidenceNote}\n\nI can set up workflows for you. What should happen:\n- When a lead submits a form\n- When an estimate is created\n- On a schedule`;

    case 'chat':
    default:
      return result.message;
  }
}

export default { handleCopilotRequest };
