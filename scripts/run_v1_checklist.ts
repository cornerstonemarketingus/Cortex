import {
  buildV1CompletionChecklist,
  type ChecklistScope,
} from '../src/crm/modules/platform/v1-checklist';

function parseScopeFromArgs(): ChecklistScope {
  const arg = process.argv.find((entry) => entry.startsWith('--scope='));
  const value = arg?.split('=')[1]?.trim().toLowerCase();

  if (value === 'all' || value === 'builder' || value === 'crm') {
    return value;
  }

  return 'all';
}

const scope = parseScopeFromArgs();
const checklist = buildV1CompletionChecklist(scope);

console.log(
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      checklist,
    },
    null,
    2
  )
);
