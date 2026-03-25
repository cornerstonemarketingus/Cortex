# Estimator Engine V1 Release Plan

## Goal
Ship an estimator engine with premium output quality, transparent confidence, and a calibration loop that compounds advantage over time.

## Engine Stack
1. Deterministic baseline by project category templates.
2. Geometry extraction from natural-language dimensions/area.
3. Macro + micro regional cost calibration by ZIP patterns.
4. Complexity and risk signal multipliers for materials/labor.
5. Confidence decomposition and calibration ranges exposed to the UI/API.
6. Closed-job calibration feedback via `/api/estimating/calibrate`.

## Release Gates
1. Accuracy gate: category-level MAPE targets and p90 thresholds.
2. Explainability gate: confidence breakdown and risk adjustments required.
3. Revenue gate: entitlement checks before premium estimator and builder paths.
4. Build gate: lint/build must pass with no new errors.

## Rollout Sequence
1. Staging backtest against historical jobs.
2. Enable premium tenants first.
3. Monitor conversion and error deltas.
4. Expand to all active subscribers after acceptance thresholds hold.

## Defensibility Moat
1. Proprietary calibration data loops by tenant, category, and ZIP clusters.
2. Operator-approved policy changes with audit traces.
3. Integrated builder + estimator + CRM loops that reduce reaction time and increase close quality.
