<#
start_crm_stack.ps1 - Start local CRM runtime stack

Starts:
- Redis container (cortex-redis)
- Postgres container (cortex-crm-postgres)
- Prisma schema sync for CRM database
- CRM worker (npm run worker:crm)

Usage:
  pwsh -ExecutionPolicy Bypass -File .\scripts\start_crm_stack.ps1

Options:
  -SkipDbPush  Skip Prisma schema sync
  -NoWorker    Start containers only (do not run worker)
#>

[CmdletBinding()]
param(
  [switch]$SkipDbPush,
  [switch]$NoWorker
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition | Split-Path -Parent
Set-Location $repoRoot

function Test-ContainerRunning {
  param([Parameter(Mandatory = $true)][string]$Name)

  $running = docker ps --format "{{.Names}}"
  return [bool]($running | Select-String -Pattern "^$Name$" -Quiet)
}

function Test-ContainerExists {
  param([Parameter(Mandatory = $true)][string]$Name)

  $all = docker ps -a --format "{{.Names}}"
  return [bool]($all | Select-String -Pattern "^$Name$" -Quiet)
}

function Ensure-Redis {
  if (Test-ContainerRunning -Name 'cortex-redis') {
    Write-Host '[crm-stack] Redis already running (cortex-redis)'
    return
  }

  if (Test-ContainerExists -Name 'cortex-redis') {
    Write-Host '[crm-stack] Starting existing Redis container (cortex-redis)'
    docker start cortex-redis | Out-Null
    return
  }

  Write-Host '[crm-stack] Creating Redis container (cortex-redis)'
  docker run -d --name cortex-redis -p 6379:6379 redis:7-alpine | Out-Null
}

function Ensure-Postgres {
  if (Test-ContainerRunning -Name 'cortex-crm-postgres') {
    Write-Host '[crm-stack] Postgres already running (cortex-crm-postgres)'
    return
  }

  if (Test-ContainerExists -Name 'cortex-crm-postgres') {
    Write-Host '[crm-stack] Starting existing Postgres container (cortex-crm-postgres)'
    docker start cortex-crm-postgres | Out-Null
    return
  }

  Write-Host '[crm-stack] Creating Postgres container (cortex-crm-postgres)'
  docker run -d --name cortex-crm-postgres `
    -e POSTGRES_DB=cortex_crm `
    -e POSTGRES_USER=postgres `
    -e POSTGRES_PASSWORD=postgres `
    -p 5432:5432 `
    postgres:16-alpine | Out-Null
}

function Wait-PostgresReady {
  $ready = $false
  for ($i = 0; $i -lt 45; $i++) {
    docker exec cortex-crm-postgres pg_isready -U postgres -d cortex_crm *> $null
    if ($LASTEXITCODE -eq 0) {
      $ready = $true
      break
    }
    Start-Sleep -Seconds 1
  }

  if (-not $ready) {
    throw 'Postgres did not become ready in time'
  }

  Write-Host '[crm-stack] Postgres is ready'
}

function Ensure-DockerAvailable {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker CLI not found in PATH'
  }

  docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    throw 'Docker daemon is not reachable. Start Docker Desktop and retry.'
  }
}

function Has-CrmWorkerProcess {
  $worker = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -like '*workers/crm.worker.ts*'
  } | Select-Object -First 1

  return [bool]$worker
}

Ensure-DockerAvailable
Ensure-Redis
Ensure-Postgres
Wait-PostgresReady

if (-not $SkipDbPush) {
  Write-Host '[crm-stack] Syncing CRM schema (prisma db push)'
  npx prisma db push --schema prisma/crm/schema.prisma --url "postgresql://postgres:postgres@localhost:5432/cortex_crm?schema=public"
}

if ($NoWorker) {
  Write-Host '[crm-stack] Containers are up. Skipped worker start due to -NoWorker.'
  exit 0
}

if (Has-CrmWorkerProcess) {
  Write-Host '[crm-stack] CRM worker already running. Stack is up.'
  exit 0
}

Write-Host '[crm-stack] Starting CRM worker (foreground). Press Ctrl+C to stop worker.'
npm run worker:crm
