# Render the DESKTOP composition in a real browser.
#
# The Electron app owns the reserved `desktop` profile, so the CLI will not compose
# it. This script copies the profile to a probe name, boots that copy on a free
# port, opens it in a headless Edge, and screenshots the header pills with the same
# DevTools tooling the web profile uses (verify/shot.mjs). Everything it starts is
# torn down again, and the `storages` snapshot is restored, so the running app and
# the user's session list are left untouched.
#
# ASCII-only on purpose (Windows PowerShell 5.1 mis-decodes non-ASCII without BOM).
#
#   pwsh -File verify/desktop-shot.ps1
#   pwsh -File verify/desktop-shot.ps1 -Out shot.png -KeepProbe
[CmdletBinding()]
param(
  [string]$DshHome = $(if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }),
  [string]$Out = $(Join-Path $env:TEMP 'dsh-desktop-pills.png'),
  [int]$TimeoutSeconds = 180,
  [string]$DebugPort = '9224',
  [string]$PreEval = 'open-session.js',
  [switch]$KeepProbe
)

$ErrorActionPreference = 'Continue'
$core = '@deepseek-ai/dsh@0.1.5-rc.1'
$profiles = Join-Path $DshHome 'profiles'
$desktopDir = Join-Path $profiles 'desktop'
$probeName = 'desktop-probe'
$probeDir = Join-Path $profiles $probeName
$here = $PSScriptRoot

if (-not (Test-Path $desktopDir)) { Write-Host 'no desktop profile here' -ForegroundColor Yellow; exit 0 }

# --- a probe copy that mirrors the app's bundle list ------------------------
if (Test-Path $probeDir) { Remove-Item -Recurse -Force $probeDir }
New-Item -ItemType Directory -Path $probeDir -Force *> $null
foreach ($file in @('package.json', 'cordis.patch.yml', 'cordis.yml', 'pnpm-workspace.yaml')) {
  $from = Join-Path $desktopDir $file
  if (Test-Path $from) { Copy-Item $from (Join-Path $probeDir $file) -Force }
}
$probeModules = Join-Path $probeDir 'node_modules'
New-Item -ItemType Directory -Path $probeModules -Force *> $null
Copy-Item (Join-Path (Join-Path $desktopDir 'node_modules') 'dsh-cost-balance-indicator') (Join-Path $probeModules 'dsh-cost-balance-indicator') -Recurse -Force

# Keep only bundles the shared profiles\node_modules can resolve: the app also lists
# bundles it serves from its own asar, and the CLI aborts on an unresolvable name.
$sharedModules = Join-Path $profiles 'node_modules'
$probeManifest = Get-Content (Join-Path $probeDir 'package.json') -Raw | ConvertFrom-Json
$keptBundles = @()
foreach ($bundle in $probeManifest.dsh.profile.bundles) {
  if (Test-Path (Join-Path $sharedModules $bundle)) { $keptBundles += $bundle } else { Write-Host ("dropping app-private bundle {0}" -f $bundle) -ForegroundColor DarkGray }
}
$probeManifest.dsh.profile.bundles = $keptBundles
[System.IO.File]::WriteAllText((Join-Path $probeDir 'package.json'), ($probeManifest | ConvertTo-Json -Depth 12) + [Environment]::NewLine, (New-Object System.Text.UTF8Encoding($false)))

$storages = Join-Path $DshHome 'storages'
$storagesBackup = Join-Path $env:TEMP ('cbb-shot-storages-' + [guid]::NewGuid().ToString('N'))
if (Test-Path $storages) { Copy-Item $storages $storagesBackup -Recurse -Force }

# --- boot the probe --------------------------------------------------------
$log = Join-Path $env:TEMP ('cbb-desktop-shot-' + [guid]::NewGuid().ToString('N') + '.log')
$proc = Start-Process -FilePath 'powershell' -WindowStyle Minimized -PassThru -ArgumentList @(
  '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
  "Set-Location '$HOME'; npx $core --profile $probeName --no-open --port 0 *> '$log'"
)
$port = $null
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 3
  if (Test-Path $log) {
    $text = Get-Content $log -Raw -ErrorAction SilentlyContinue
    if ($text -match 'https?://127\.0\.0\.1:(\d+)/\?token=(\S+)') { $port = $Matches[1]; $url = $Matches[0]; break }
  }
  if ($proc.HasExited) { break }
}
if ($port -eq $null) {
  Write-Host 'the probe profile did not reach a launch URL' -ForegroundColor Red
  if (Test-Path $log) { Get-Content $log -Tail 8 }
  exit 1
}
Write-Host ("probe composition on port {0}" -f $port) -ForegroundColor Cyan

# --- screenshot the pills through the DevTools protocol --------------------
$edge = @(
  (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
  (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe')
) | Where-Object { Test-Path $_ } | Select-Object -First 1
$profile = Join-Path $env:TEMP 'edge-cbb-desktop'
Start-Process -FilePath $edge -WindowStyle Hidden -ArgumentList @(
  '--headless=new', '--disable-gpu', ("--remote-debugging-port={0}" -f $DebugPort),
  ("--user-data-dir={0}" -f $profile), '--window-size=1400,900', '--no-first-run', $url
) | Out-Null
Start-Sleep -Seconds 10

$eval = "JSON.stringify([...document.querySelectorAll('.dsh-cost-balance-indicator-header,.dsh-peak-indicator-badge,.dsh-peak-indicator-turn-cost,.dsh-cost-balance-indicator-balance')].map((el) => el.className + ' :: ' + el.textContent))"
& node (Join-Path $here 'shot.mjs') --port $DebugPort --no-cache --reload --out $Out --wait 12000 --pre-eval-file (Join-Path $here $PreEval) --pre-wait 8000 --eval $eval --width 1100 --height 700 --clip "0,0,1100,60" --scale 2

# --- tear everything down --------------------------------------------------
$headless = Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -match 'edge-cbb-desktop' }
foreach ($item in $headless) { taskkill /PID $item.ProcessId /T /F *> $null }
if ($proc -and -not $proc.HasExited) { taskkill /PID $proc.Id /T /F *> $null }
for ($i = 0; $i -lt 10; $i++) {
  Start-Sleep -Seconds 1
  $listener = netstat -ano -p tcp | Select-String -Pattern 'LISTENING' | Select-String -Pattern (':' + $port + '\s')
  if ($listener -eq $null) { break }
  foreach ($line in $listener) {
    $pieces = ($line -as [string]).Trim() -split '\s+'
    $owner = $pieces[$pieces.Count - 1]
    if ($owner -match '^\d+$') { taskkill /PID $owner /T /F *> $null }
  }
}
if (-not $KeepProbe) { Remove-Item -Recurse -Force $probeDir -ErrorAction SilentlyContinue }
Remove-Item $log -ErrorAction SilentlyContinue
if (Test-Path $storagesBackup) {
  if (Test-Path $storages) { Remove-Item -Recurse -Force $storages }
  Copy-Item $storagesBackup $storages -Recurse -Force
  Remove-Item -Recurse -Force $storagesBackup -ErrorAction SilentlyContinue
}
Write-Host ("screenshot -> {0}" -f $Out) -ForegroundColor Green
Write-Host 'probe torn down, storages restored'
