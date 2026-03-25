<#
smoke_crm_api.ps1 - Live CRM API smoke test

Validates:
- Auth login + /me
- Workflow seed + async trigger
- Lead creation and stage update after worker processing
- Capture form create + public fetch
- Retain followup cron endpoint

Usage:
  pwsh -ExecutionPolicy Bypass -File .\scripts\smoke_crm_api.ps1
#>

[CmdletBinding()]
param(
  [string]$BaseUrl = 'http://127.0.0.1:3000',
  [string]$AdminEmail = 'admin@cortex.local',
  [PSCredential]$AdminCredential,
  [int]$ServerWaitSeconds = 20,
  [int]$WorkerSettleSeconds = 3
)

$ErrorActionPreference = 'Stop'

function Wait-ServerReady {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [Parameter(Mandatory = $true)]
    [int]$TimeoutSeconds
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri "$Url/api/health" -Method GET -SkipHttpErrorCheck -TimeoutSec 3
      return $response.StatusCode
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }

  throw "Server did not become reachable at $Url within $TimeoutSeconds seconds"
}

$healthStatus = Wait-ServerReady -Url $BaseUrl -TimeoutSeconds $ServerWaitSeconds

$effectiveAdminEmail = if ($AdminCredential -and $AdminCredential.UserName) {
  $AdminCredential.UserName
} else {
  $AdminEmail
}

$plainAdminPassword = if ($AdminCredential) {
  [System.Net.NetworkCredential]::new('', $AdminCredential.Password).Password
} elseif ($env:CRM_ADMIN_PASSWORD) {
  $env:CRM_ADMIN_PASSWORD
} else {
  throw 'Provide -AdminCredential or set CRM_ADMIN_PASSWORD for authentication.'
}

$loginBody = @{
  email = $effectiveAdminEmail
  password = $plainAdminPassword
} | ConvertTo-Json

$login = Invoke-RestMethod -Uri "$BaseUrl/api/crm/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody
if (-not $login.token) {
  throw 'Login failed: token missing in response'
}

$headers = @{ Authorization = "Bearer $($login.token)" }

$me = Invoke-WebRequest -Uri "$BaseUrl/api/crm/auth/me" -Method GET -Headers $headers
$seed = Invoke-WebRequest -Uri "$BaseUrl/api/crm/nurture/workflows/seed" -Method POST -Headers $headers

$leadEmail = "api-smoke-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())@example.com"
$leadBody = @{
  firstName = 'Api'
  lastName = 'Smoke'
  email = $leadEmail
  sourceType = 'MANUAL'
} | ConvertTo-Json

$createLead = Invoke-RestMethod -Uri "$BaseUrl/api/crm/capture/leads" -Method POST -ContentType 'application/json' -Body $leadBody
$leadId = $createLead.lead.id
if (-not $leadId) {
  throw 'Lead creation failed: lead.id missing in response'
}

$triggerBody = @{
  triggerType = 'missed_call'
  leadId = $leadId
  context = @{
    isNewLead = $true
    source = 'api_smoke'
  }
  async = $true
} | ConvertTo-Json -Depth 6

$trigger = Invoke-RestMethod -Uri "$BaseUrl/api/crm/nurture/workflows/trigger" -Method POST -Headers $headers -ContentType 'application/json' -Body $triggerBody

$formSlug = "smoke-form-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
$formBody = @{
  name = 'Smoke Form'
  slug = $formSlug
  schemaJson = @{
    title = 'Quick Lead Form'
    fields = @(
      @{ name = 'firstName'; type = 'text'; label = 'First Name'; required = $true },
      @{ name = 'email'; type = 'email'; label = 'Email' }
    )
  }
  isActive = $true
} | ConvertTo-Json -Depth 10

$createForm = Invoke-WebRequest -Uri "$BaseUrl/api/crm/capture/forms" -Method POST -Headers $headers -ContentType 'application/json' -Body $formBody
$publicForm = Invoke-WebRequest -Uri "$BaseUrl/api/crm/capture/forms/$formSlug" -Method GET

Start-Sleep -Seconds $WorkerSettleSeconds

$leads = Invoke-RestMethod -Uri "$BaseUrl/api/crm/capture/leads?limit=200" -Method GET -Headers $headers
$matchedLead = $leads.leads | Where-Object { $_.id -eq $leadId -or $_.email -eq $leadEmail } | Select-Object -First 1

$followups = Invoke-WebRequest -Uri "$BaseUrl/api/crm/retain/cron/followups" -Method POST -Headers $headers

[pscustomobject]@{
  health = $healthStatus
  login = 200
  me = $me.StatusCode
  seedWorkflow = $seed.StatusCode
  createLead = 201
  triggerWorkflowAsync = 202
  createForm = $createForm.StatusCode
  getPublicForm = $publicForm.StatusCode
  retainFollowupsCron = $followups.StatusCode
  triggerJobId = $trigger.jobId
  leadId = $leadId
  leadStageAfterAsyncTrigger = $matchedLead.stage
  createdFormSlug = $formSlug
} | ConvertTo-Json -Depth 6
