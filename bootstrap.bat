@echo off
setlocal enabledelayedexpansion
echo === CORTEXEngine bootstrap ===
if not exist vcpkg (
  echo Cloning vcpkg...
  git clone --depth 1 https://github.com/microsoft/vcpkg.git vcpkg || (
    echo Failed to clone vcpkg. Ensure git is installed and network access is available.
    exit /b 1
  )
) else (
  echo vcpkg directory already exists, skipping clone.
)

cd vcpkg || exit /b 1necho Bootstrapping vcpkg (may take several minutes)...
call bootstrap-vcpkg.bat || (
  echo bootstrap-vcpkg.bat failed. Check prerequisites (Visual Studio Build Tools) and try again.
  exit /b 1
)

echo Installing required packages via vcpkg (bullet3, glfw3, glm, vulkan)
.\\vcpkg.exe install bullet3:x64-windows glfw3:x64-windows glm:x64-windows vulkan-headers:x64-windows vulkan-loader:x64-windows || (
  echo One or more vcpkg installs failed. Check the output above for errors.
  rem continue but exit code indicates partial failure
)

echo Bootstrap complete. To use vcpkg with CMake:
echo cmake -S . -B build -DCMAKE_TOOLCHAIN_FILE=%%cd%%\scripts\buildsystems\vcpkg.cmake -DBUILD_WITH_BULLET=ON
cd ..
echo Done.
