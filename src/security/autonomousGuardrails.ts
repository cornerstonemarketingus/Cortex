type GuardrailMode = 'propose' | 'apply';

type RiskBand = 'low' | 'medium' | 'high' | 'critical';

export type AutonomousGuardrailInput = {
  mode: GuardrailMode;
  dryRun: boolean;
  task: string;
  rollbackPlan?: string;
};

export type AutonomousGuardrailDecision = {
  allowed: boolean;
  riskScore: number;
  riskBand: RiskBand;
  requiresRollbackPlan: boolean;
  reasons: string[];
};

const HIGH_RISK_PATTERNS: RegExp[] = [
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+checkout\s+--\b/i,
  /\brm\s+-rf\b/i,
  /\btruncate\b/i,
  /\bdrop\s+table\b/i,
  /\bdelete\s+from\b/i,
  /\bshutdown\b/i,
  /\bkill\s+-9\b/i,
  /\bterraform\s+destroy\b/i,
];

const MEDIUM_RISK_PATTERNS: RegExp[] = [
  /\bapply\b/i,
  /\bmigration\b/i,
  /\bdeploy\b/i,
  /\bproduction\b/i,
  /\brename\b/i,
  /\bdelete\b/i,
  /\brollback\b/i,
  /\bhotfix\b/i,
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resolveRiskBand(score: number): RiskBand {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

export function evaluateAutonomousGuardrails(
  input: AutonomousGuardrailInput
): AutonomousGuardrailDecision {
  const reasons: string[] = [];
  const normalizedTask = input.task.trim();

  let score = 0;

  const highRiskMatches = HIGH_RISK_PATTERNS.filter((pattern) => pattern.test(normalizedTask)).length;
  if (highRiskMatches > 0) {
    score += highRiskMatches * 24;
    reasons.push('Detected destructive command or data-loss keywords.');
  }

  const mediumRiskMatches = MEDIUM_RISK_PATTERNS.filter((pattern) => pattern.test(normalizedTask)).length;
  if (mediumRiskMatches > 0) {
    score += mediumRiskMatches * 8;
    reasons.push('Detected elevated operational changes (deploy/migration/apply).');
  }

  if (input.mode === 'apply' && !input.dryRun) {
    score += 18;
    reasons.push('Real apply mode without dry run increases blast radius.');
  }

  if (normalizedTask.length > 2000) {
    score += 10;
    reasons.push('Large execution prompt reduces precision and increases execution risk.');
  }

  score = clamp(score, 0, 100);
  const riskBand = resolveRiskBand(score);

  const requiresRollbackPlan = input.mode === 'apply' && !input.dryRun && score >= 55;
  const hasRollbackPlan = Boolean(input.rollbackPlan && input.rollbackPlan.trim().length >= 10);

  const allowed =
    score < 85 &&
    (!requiresRollbackPlan || hasRollbackPlan);

  if (requiresRollbackPlan && !hasRollbackPlan) {
    reasons.push('Rollback plan is required for elevated-risk apply execution.');
  }

  if (score >= 85) {
    reasons.push('Risk score exceeded hard safety threshold for autonomous apply.');
  }

  return {
    allowed,
    riskScore: score,
    riskBand,
    requiresRollbackPlan,
    reasons,
  };
}
