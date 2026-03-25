<#
run_crm_worker.ps1 - Start CRM queue workers

Runs:
  npm run worker:crm

Usage:
  pwsh -ExecutionPolicy Bypass -File .\scripts\run_crm_worker.ps1
#>

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition | Split-Path -Parent
Set-Location $RepoRoot

Write-Host "[run_crm_worker] Repo root: $RepoRoot"
Write-Host "[run_crm_worker] Starting CRM worker..."

npm run worker:crm
