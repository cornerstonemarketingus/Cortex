<#
setup_dev_env.ps1 - Developer convenience script for Windows (PowerShell)

Performs:
 1. Run bootstrap-vcpkg.bat (repo root)
 2. Build engine: pwsh -Command "./build_engine.ps1 -BuildDir build -Config Debug"
 3. Start approval API (src/ai/approval_api_v2.py) in background
 4. Optionally seed bootstrap_self_improvement.py
 5. Launch engine executable: build\Debug\CortexEngine.exe

Usage:
  pwsh -ExecutionPolicy Bypass -File .\scripts\setup_dev_env.ps1 [-Seed]

Flags:
  -Seed : also run the bootstrap_self_improvement.py script after API is ready

Behavior:
 - Stops on error and prints clear status messages
 - Checks for required tools (git, python, cmake, pwsh)
 - Starts approval API in a background process and waits for health
#>

param(
    [switch]$Seed
)

function Log($msg) { Write-Host "[INFO] $msg" }
function ErrorExit($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red; exit 1 }

# Ensure script runs from repo root (script located in scripts/)
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition | Split-Path -Parent
Set-Location $RepoRoot

Log "Repo root: $RepoRoot"

# Check required tools
$tools = @('git','python','cmake','pwsh')
foreach ($t in $tools) {
    if (-not (Get-Command $t -ErrorAction SilentlyContinue)) {
        ErrorExit "Required tool '$t' not found in PATH. Please install and retry."
    }
}

# Step 1: Bootstrap vcpkg (with retries)
Log "Step 1/5: Bootstrapping vcpkg"
$bootstrap = Join-Path $RepoRoot 'bootstrap-vcpkg.bat'
if (-not (Test-Path $bootstrap)) { ErrorExit "bootstrap-vcpkg.bat not found at $bootstrap" }
$maxAttempts = 3
$attempt = 0
$success = $false
$lastCode = 1
while ($attempt -lt $maxAttempts -and -not $success) {
    $attempt++
    Log "Bootstrapping attempt $attempt of $maxAttempts..."
    cmd.exe /c "`"$bootstrap`""
    $lastCode = $LASTEXITCODE
    if ($lastCode -eq 0) { $success = $true; break }
    Write-Host "[WARN] bootstrap attempt $attempt failed with exit code $lastCode" -ForegroundColor Yellow
    Start-Sleep -Seconds (5 * $attempt)
}
if (-not $success) { ErrorExit "bootstrap-vcpkg.bat failed after $maxAttempts attempts (last code $lastCode)" }
Log "vcpkg bootstrap completed"

# Step 2: Build engine
Log "Step 2/5: Building CortexEngine (Debug)"
try {
    pwsh -Command "./build_engine.ps1 -BuildDir build -Config Debug"
    if ($LASTEXITCODE -ne 0) { ErrorExit "Build failed with exit code $LASTEXITCODE" }
} catch {
    ErrorExit "Exception during build: $_"
}
Log "Build completed"

# Step 3: Start approval API (background)
Log "Step 3/5: Starting approval API (src/ai/approval_api_v2.py)"
$pythonExe = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $pythonExe) { ErrorExit "Python not found" }
# Use Start-Process to run in background and redirect output to logs
$apiLog = Join-Path $RepoRoot 'logs\approval_api.log'
if (-not (Test-Path (Split-Path $apiLog))) { New-Item -ItemType Directory -Path (Split-Path $apiLog) | Out-Null }
$startInfo = @{
    FilePath = $pythonExe
    ArgumentList = 'src/ai/approval_api_v2.py'
    RedirectStandardOutput = $true
    RedirectStandardError = $true
    WorkingDirectory = $RepoRoot
}
# PowerShell Start-Process doesn't support redirect directly; use Start-Process with -NoNewWindow and Out-File via cmd
$proc = Start-Process -FilePath $pythonExe -ArgumentList 'src/ai/approval_api_v2.py' -NoNewWindow -PassThru -WorkingDirectory $RepoRoot
Start-Sleep -Seconds 1
if ($proc.HasExited) { ErrorExit "Approval API failed to start (exit code $($proc.ExitCode))" }
Log "Approval API process started (PID: $($proc.Id)). Waiting for health..."

# Wait for health endpoint
$healthUrl = 'http://localhost:5001/health'
$ok = $false
for ($i=0; $i -lt 30; $i++) {
    try {
        $r = Invoke-RestMethod -Method Get -Uri $healthUrl -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($r -and $r.ok) { $ok = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
}
if (-not $ok) { ErrorExit "Approval API did not respond on $healthUrl" }
Log "Approval API ready"

# Optional Step 4: Seed bootstrap proposal
if ($Seed) {
    Log "Step 4/5: Seeding bootstrap self-improvement proposal"
    try {
        $res = Invoke-RestMethod -Method Post -Uri 'http://localhost:5001/bootstrap_proposal' -ErrorAction Stop
        Log "Seed response: $($res | ConvertTo-Json -Compress)"
    } catch {
        ErrorExit "Failed to seed bootstrap proposal: $_"
    }
}

# Step 5: Launch engine executable
Log "Step 5/5: Launching CortexEngine"
$exe = Join-Path $RepoRoot 'build\Debug\CortexEngine.exe'
if (-not (Test-Path $exe)) { ErrorExit "Engine executable not found at $exe. Confirm build output." }
# Launch engine in a new window so script can exit if desired
Start-Process -FilePath $exe -WorkingDirectory $RepoRoot
Log "Engine launched. Setup complete."

# End
