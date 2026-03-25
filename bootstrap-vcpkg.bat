@echo off
setlocal
REM bootstrap-vcpkg.bat - clone vcpkg if missing, bootstrap it, and install common packages for x64-windows
set VCPKG_DIR=%~dp0vcpkg

if exist "%VCPKG_DIR%\" (
  echo vcpkg already present at "%VCPKG_DIR%". Skipping clone.
) else (
  echo vcpkg not found, attempting to clone into "%VCPKG_DIR%"...
  where git >nul 2>&1
  if errorlevel 1 (
    echo Git not found in PATH. Please install Git and re-run this script.
    exit /b 1
  )
  git clone https://github.com/microsoft/vcpkg.git "%VCPKG_DIR%" || (
    echo git clone failed. Check network and credentials.
    exit /b 1
  )
)

pushd "%VCPKG_DIR%"
if not exist "bootstrap-vcpkg.bat" (
  echo bootstrap-vcpkg.bat not found in vcpkg repo. Exiting.
  popd
  exit /b 1
)

echo Bootstrapping vcpkg (this may take a few minutes)...
call "bootstrap-vcpkg.bat" || (
  echo bootstrap-vcpkg.bat failed. See output above.
  popd
  exit /b 1
)

echo Installing packages for x64-windows: bullet3 glfw3 glm vulkan-headers vulkan-loader pybind11
"%VCPKG_DIR%\vcpkg.exe" install bullet3:x64-windows glfw3:x64-windows glm:x64-windows vulkan-headers:x64-windows vulkan-loader:x64-windows pybind11:x64-windows || (
  echo vcpkg install failed. See vcpkg output.
  popd
  exit /b 1
)

echo vcpkg bootstrap and package installation completed successfully.
popd
endlocal
exit /b 0
