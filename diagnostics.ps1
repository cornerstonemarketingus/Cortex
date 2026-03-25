$log = Join-Path $PWD 'vcpkg-diagnostic.log'
"Diagnostic started at $(Get-Date)" | Out-File $log

function Log($s) { $s | Out-File $log -Append; Write-Output $s }

Log '--- Environment ---'
$git = Get-Command git -ErrorAction SilentlyContinue; if ($git) { Log "GIT: $($git.Path)" } else { Log 'GIT: not found' }
$cmake = Get-Command cmake -ErrorAction SilentlyContinue; if ($cmake) { Log "CMAKE: $($cmake.Path)" } else { Log 'CMAKE: not found' }
$cl = Get-Command cl -ErrorAction SilentlyContinue; if ($cl) { Log "MSVC: $($cl.Path)" } else { Log 'MSVC: not found' }

try { $ping = Test-NetConnection -ComputerName 'github.com' -Port 443 -WarningAction SilentlyContinue; Log "GITHUB_TCP_OK: $($ping.TcpTestSucceeded)" } catch { Log 'GITHUB_TCP_OK: ERROR' }

if (-not (Test-Path '.\vcpkg')) {
  Log 'Cloning vcpkg (shallow)...'
  $res = git clone --depth 1 https://github.com/microsoft/vcpkg.git vcpkg 2>&1
  $res | Out-File $log -Append
  Log "GIT_EXIT: $LASTEXITCODE"
  if ($LASTEXITCODE -ne 0) { Log 'ERROR: git clone failed'; exit 3 }
} else { Log 'vcpkg already present' }

Set-Location '.\vcpkg'
Log "PWD: $(Get-Location)"

if (-not (Test-Path '.\vcpkg.exe')) {
  Log 'Bootstrapping vcpkg...'
  $boot = & .\bootstrap-vcpkg.bat 2>&1
  $boot | Out-File $log -Append
  Log "BOOT_EXIT: $LASTEXITCODE"
  if ($LASTEXITCODE -ne 0) { Log 'ERROR: vcpkg bootstrap failed'; exit 4 }
} else { Log 'vcpkg.exe already exists' }

if (Test-Path '.\vcpkg.exe') { & .\vcpkg.exe --version 2>&1 | Out-File $log -Append }

Log 'Installing glm (test)'
& .\vcpkg.exe install glm:x64-windows 2>&1 | Out-File $log -Append
Log "INST_EXIT: $LASTEXITCODE"

Set-Location '..'
Log 'DIAGNOSTIC_DONE'
Write-Output "Detailed log written to: $log" 
