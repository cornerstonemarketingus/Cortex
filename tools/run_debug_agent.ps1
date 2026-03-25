# run_debug_agent.ps1 - runs the engine bootstrap (configure + build + run) in PowerShell
param(
    [string]$BuildDir = "build",
    [string]$Config = "Debug"
)
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptRoot

$toolchain = $null
if ($Env:VCPKG_ROOT) {
    $toolchain = Join-Path $Env:VCPKG_ROOT "scripts\buildsystems\vcpkg.cmake"
} elseif (Test-Path (Join-Path $ScriptRoot "vcpkg\scripts\buildsystems\vcpkg.cmake")) {
    $toolchain = Join-Path $ScriptRoot "vcpkg\scripts\buildsystems\vcpkg.cmake"
}
if (-not $toolchain -or -not (Test-Path $toolchain)) { Write-Error "vcpkg toolchain file not found."; exit 1 }

# configure and build using build_engine.ps1
Write-Host "Configuring and building..."
.\build_engine.ps1 -BuildDir $BuildDir -Config $Config
if ($LASTEXITCODE -ne 0) { Write-Error "build_engine.ps1 failed"; exit $LASTEXITCODE }

# Run the built executable if present
$exe = Join-Path $ScriptRoot (Join-Path $BuildDir "${Config}\CortexEngine.exe")
if (Test-Path $exe) {
    Write-Host "Running CortexEngine.exe..."
    & $exe
} else {
    Write-Warning "Executable not found: $exe"
}
