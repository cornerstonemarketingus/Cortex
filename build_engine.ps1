# build_engine.ps1 - Configure and build CORTEXEngine using vcpkg toolchain
param(
    [string]$BuildDir = "build",
    [string]$Config = "Debug"
)

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptRoot

if (-not (Test-Path $BuildDir)) {
    Write-Host "Creating build directory: $BuildDir"
    New-Item -ItemType Directory -Path $BuildDir | Out-Null
}

# Locate vcpkg toolchain file
$toolchain = $null
if ($Env:VCPKG_ROOT) {
    $toolchain = Join-Path $Env:VCPKG_ROOT "scripts\buildsystems\vcpkg.cmake"
} elseif (Test-Path (Join-Path $ScriptRoot "vcpkg\scripts\buildsystems\vcpkg.cmake")) {
    $toolchain = Join-Path $ScriptRoot "vcpkg\scripts\buildsystems\vcpkg.cmake"
}

if (-not $toolchain -or -not (Test-Path $toolchain)) {
    Write-Error "vcpkg toolchain file not found. Set VCPKG_ROOT or clone vcpkg into the repo root."
    exit 1
}

Write-Host "Using vcpkg toolchain: $toolchain"

# Configure CMake
$cmakeArgs = @(
    "-S", $ScriptRoot,
    "-B", (Join-Path $ScriptRoot $BuildDir),
    "-DCMAKE_TOOLCHAIN_FILE=$toolchain",
    "-DBUILD_WITH_BULLET=ON",
    "-DBUILD_WITH_VULKAN=ON",
    "-DBUILD_PYBIND=ON"
)

Write-Host "Running CMake configure..."
cmake @cmakeArgs
if ($LASTEXITCODE -ne 0) { Write-Error "CMake configure failed"; exit $LASTEXITCODE }

Write-Host "Building project ($Config) ..."
cmake --build (Join-Path $ScriptRoot $BuildDir) --config $Config
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit $LASTEXITCODE }

Write-Host "Build completed successfully."