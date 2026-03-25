<#
run_engine.ps1 - Build and run CortexEngine developer launcher

Performs:
 1. Ensures Git is installed (attempts winget/choco or downloads installer)
 2. Calls scripts/setup_dev_env.ps1 (which bootstraps vcpkg, builds, starts approval API, optionally seeds, and launches engine)

Usage:
  pwsh -ExecutionPolicy Bypass -File .\scripts\run_engine.ps1 [-Seed]

Flags:
  -Seed : pass through to setup_dev_env.ps1 to seed bootstrap proposal

Notes:
 - Requires elevated PowerShell for installer steps when installing Git.
 - Respects existing installation of Git.
#>

param(
    [switch]$Seed
)

function Log($m) { Write-Host "[run_engine] $m" }
function ErrorExit($m) { Write-Host "[ERROR] $m" -ForegroundColor Red; exit 1 }

# Determine repo root
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition | Split-Path -Parent
Set-Location $RepoRoot

Log "Repo root: $RepoRoot"

# Ensure Git
if (Get-Command git -ErrorAction SilentlyContinue) {
    Log "Git found: $(git --version | Out-String)"
} else {
    Log "Git not found. Attempting install..."
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Log "Using winget to install Git"
        try {
            winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements -h
        } catch {
            Write-Host "winget install failed: $_" -ForegroundColor Yellow
        }
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        Log "Using choco to install Git"
        choco install git -y
    } else {
        Log "Downloading Git for Windows installer"
        $tmp = Join-Path $env:TEMP "Git-Installer.exe"
        try {
            Invoke-WebRequest -Uri "https://github.com/git-for-windows/git/releases/latest/download/Git-64-bit.exe" -OutFile $tmp -UseBasicParsing -ErrorAction Stop
            Start-Process -FilePath $tmp -ArgumentList '/VERYSILENT','/NORESTART' -Wait -Verb RunAs
        } catch {
            ErrorExit "Failed to download or run Git installer: $_"
        }
    }
    Start-Sleep -Seconds 2
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        ErrorExit "Git still not available after installation attempts. Please install Git manually and re-run."
    }
    Log "Git installed: $(git --version | Out-String)"
}

# Call setup script
$setupScript = Join-Path $RepoRoot 'scripts\setup_dev_env.ps1'
if (-not (Test-Path $setupScript)) { ErrorExit "setup_dev_env.ps1 not found at $setupScript" }
$arg = if ($Seed) { '-Seed' } else { '' }
Log "Invoking setup: $setupScript $arg"
try {
    pwsh -ExecutionPolicy Bypass -File $setupScript $arg
} catch {
    ErrorExit "Setup failed: $_"
}

Log "run_engine completed"
