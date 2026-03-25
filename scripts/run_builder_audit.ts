import {
  aiOptimizationOptions,
  builderBlueprints,
  builderPlaybooks,
  businessBuilderFeatures,
  gameBuilderTracks,
  requiredBuilderBlueprintIds,
} from '../lib/builder-intelligence';

type AuditIssue = {
  severity: 'error' | 'warning';
  message: string;
};

const issues: AuditIssue[] = [];

const addIssue = (severity: AuditIssue['severity'], message: string) => {
  issues.push({ severity, message });
};

const uniqueCount = (values: string[]) => new Set(values).size;

const hasBuildCommand = (commands: string[]) => commands.some((command) => command.includes('npm run build'));

const blueprintIds = builderBlueprints.map((blueprint) => blueprint.id);
const playbookIds = builderPlaybooks.map((playbook) => playbook.id);

if (uniqueCount(blueprintIds) !== blueprintIds.length) {
  addIssue('error', 'Duplicate builder blueprint IDs detected.');
}

if (uniqueCount(playbookIds) !== playbookIds.length) {
  addIssue('error', 'Duplicate builder playbook IDs detected.');
}

for (const requiredId of requiredBuilderBlueprintIds) {
  if (!blueprintIds.includes(requiredId)) {
    addIssue('error', `Missing required blueprint: ${requiredId}`);
  }
}

for (const blueprint of builderBlueprints) {
  if (blueprint.objective.trim().length < 40) {
    addIssue('warning', `Blueprint objective is short and may be under-specified: ${blueprint.id}`);
  }

  if (!hasBuildCommand(blueprint.suggestedCommands)) {
    addIssue('warning', `Blueprint ${blueprint.id} does not include a build command.`);
  }

  if (blueprint.outcomes.length < 2) {
    addIssue('warning', `Blueprint ${blueprint.id} has too few outcomes defined.`);
  }
}

if (businessBuilderFeatures.length < 5) {
  addIssue('error', 'Business builder should define at least 5 advanced features.');
}

if (!gameBuilderTracks.some((track) => track.id === 'roblox')) {
  addIssue('error', 'Game builder is missing Roblox track support.');
}

if (!gameBuilderTracks.some((track) => track.id === 'marketplace')) {
  addIssue('error', 'Game builder is missing marketplace publishing track support.');
}

if (aiOptimizationOptions.length < 5) {
  addIssue('warning', 'AI optimization profile has fewer than 5 options.');
}

const errorCount = issues.filter((issue) => issue.severity === 'error').length;
const warningCount = issues.filter((issue) => issue.severity === 'warning').length;

console.log(
  JSON.stringify(
    {
      status: errorCount === 0 ? 'pass' : 'fail',
      summary: {
        blueprintCount: builderBlueprints.length,
        playbookCount: builderPlaybooks.length,
        businessFeatureCount: businessBuilderFeatures.length,
        gameTrackCount: gameBuilderTracks.length,
        aiOptimizationCount: aiOptimizationOptions.length,
        errorCount,
        warningCount,
      },
      issues,
    },
    null,
    2
  )
);

if (errorCount > 0) {
  process.exit(1);
}
