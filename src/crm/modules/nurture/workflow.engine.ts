import type {
  WorkflowAction,
  WorkflowCondition,
  WorkflowDefinition,
} from './nurture.types';

function getValueByPath(context: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.');
  let current: unknown = context;

  for (const segment of segments) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function compare(condition: WorkflowCondition, actual: unknown): boolean {
  switch (condition.operator) {
    case 'exists':
      return actual !== undefined && actual !== null;
    case 'eq':
      return actual === condition.value;
    case 'ne':
      return actual !== condition.value;
    case 'gt':
      return Number(actual) > Number(condition.value);
    case 'gte':
      return Number(actual) >= Number(condition.value);
    case 'lt':
      return Number(actual) < Number(condition.value);
    case 'lte':
      return Number(actual) <= Number(condition.value);
    case 'contains':
      if (Array.isArray(actual)) {
        return actual.includes(condition.value);
      }
      return String(actual ?? '').toLowerCase().includes(String(condition.value ?? '').toLowerCase());
    case 'in':
      if (!Array.isArray(condition.value)) {
        return false;
      }
      return condition.value.includes(actual);
    default:
      return false;
  }
}

export class WorkflowEngine {
  evaluate(definition: WorkflowDefinition, context: Record<string, unknown>) {
    if (!definition.conditions || definition.conditions.length === 0) {
      return true;
    }

    return definition.conditions.every((condition) => {
      const actual = getValueByPath(context, condition.field);
      return compare(condition, actual);
    });
  }

  resolveActions(definition: WorkflowDefinition): WorkflowAction[] {
    return definition.actions || [];
  }
}
