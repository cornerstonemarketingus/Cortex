$ErrorActionPreference = 'Stop'

Write-Host 'Building production image...'
docker build -t bidbuild-web:latest .

Write-Host 'Starting stack with docker compose...'
docker compose up --build -d

Write-Host 'Checking readiness endpoint...'
Start-Sleep -Seconds 3
try {
  $response = Invoke-RestMethod -Uri 'http://localhost:3000/api/readyz' -Method Get
  $response | ConvertTo-Json -Depth 4
  Write-Host 'Production stack is running.'
} catch {
  Write-Host 'Ready check failed. Inspect logs with: docker compose logs -f web'
  throw
}
