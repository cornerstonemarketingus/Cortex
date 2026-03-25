param(
  [string]$TenantId = $env:EST_BACKTEST_TENANT_ID,
  [string]$SubscriberEmail = $env:EST_BACKTEST_SUBSCRIBER_EMAIL,
  [string]$Token = $env:EST_BACKTEST_TOKEN,
  [string]$BaseUrl = $(if ($env:EST_BACKTEST_BASE_URL) { $env:EST_BACKTEST_BASE_URL } else { 'http://127.0.0.1:3000' }),
  [double]$OverallThreshold = $(if ($env:EST_BACKTEST_OVERALL_THRESHOLD) { [double]$env:EST_BACKTEST_OVERALL_THRESHOLD } else { 8 }),
  [double]$CategoryThreshold = $(if ($env:EST_BACKTEST_CATEGORY_THRESHOLD) { [double]$env:EST_BACKTEST_CATEGORY_THRESHOLD } else { 12 }),
  [string]$ReportPath = 'tests/reports/estimator-backtest-report.json'
)

$missing = @()
if (-not $TenantId) { $missing += 'EST_BACKTEST_TENANT_ID' }
if (-not $SubscriberEmail) { $missing += 'EST_BACKTEST_SUBSCRIBER_EMAIL' }
if (-not $Token) { $missing += 'EST_BACKTEST_TOKEN' }

if ($missing.Count -gt 0) {
  Write-Host "[backtest-wrapper] Missing required env vars: $($missing -join ', ')" -ForegroundColor Red
  Write-Host "Set them and rerun: .\\scripts\\run_estimator_backtest.ps1" -ForegroundColor Yellow
  exit 1
}

$env:EST_BACKTEST_TENANT_ID = $TenantId
$env:EST_BACKTEST_SUBSCRIBER_EMAIL = $SubscriberEmail
$env:EST_BACKTEST_TOKEN = $Token
$env:EST_BACKTEST_BASE_URL = $BaseUrl
$env:EST_BACKTEST_OVERALL_THRESHOLD = [string]$OverallThreshold
$env:EST_BACKTEST_CATEGORY_THRESHOLD = [string]$CategoryThreshold

Write-Host "[backtest-wrapper] Running estimator backtest against $BaseUrl ..." -ForegroundColor Cyan
npm run backtest:estimator -- --report-path $ReportPath
$exitCode = $LASTEXITCODE

if (-not (Test-Path $ReportPath)) {
  Write-Host "[backtest-wrapper] Report file not found at $ReportPath" -ForegroundColor Red
  exit 1
}

$report = Get-Content $ReportPath -Raw | ConvertFrom-Json

Write-Host "`n[backtest-wrapper] Thresholds:" -ForegroundColor Cyan
Write-Host "- Overall MAPE <= $($report.thresholds.overallMapePercent)%"
Write-Host "- Category MAPE <= $($report.thresholds.categoryMapePercent)%"

$overallColor = if ($report.overall.pass) { 'Green' } else { 'Red' }
Write-Host "`n[backtest-wrapper] Overall: $($report.overall.mapePercent)% => $(if ($report.overall.pass) { 'PASS' } else { 'FAIL' })" -ForegroundColor $overallColor

Write-Host "`n[backtest-wrapper] Category MAPE:" -ForegroundColor Cyan
foreach ($item in $report.categories) {
  $color = if ($item.pass) { 'Green' } else { 'Red' }
  $status = if ($item.pass) { 'PASS' } else { 'FAIL' }
  Write-Host "- $($item.category): $($item.mapePercent)% ($($item.fixtures) jobs) => $status" -ForegroundColor $color
}

if ($exitCode -eq 2) {
  Write-Host "`n[backtest-wrapper] Release gate failed. Review calibration data before release." -ForegroundColor Red
  exit 2
}

if ($exitCode -ne 0) {
  Write-Host "`n[backtest-wrapper] Backtest command failed with exit code $exitCode" -ForegroundColor Red
  exit $exitCode
}

Write-Host "`n[backtest-wrapper] Backtest gates passed." -ForegroundColor Green
exit 0
