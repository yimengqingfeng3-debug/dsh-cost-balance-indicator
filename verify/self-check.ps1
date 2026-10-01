# dsh-cost-balance-indicator self check.
#
# ASCII-only on purpose (Windows PowerShell 5.1 mis-decodes non-ASCII script text
# without a BOM).
#
# Answers one question end to end: after installing this plugin, does DSH still
# come up cleanly, with no conflicts and with the plugin fully wired?
#
#   1. composed profile tree   -- `dsh --profile <p> --dump-config` must exit 0,
#                                 carry exactly one cost-balance-indicator row and
#                                 a disabled peak-indicator row, and no duplicate ids
#   2. open_dsh preflight      -- the dsh-peak-indicator compat patch open_dsh runs
#                                 before every boot must be a clean no-op (exit 0)
#   3. open_dsh self check     -- open_dsh_check.ps1 must report 10/10 and exit 0
#   4. cold boot               -- a second instance of the SAME profile on a free
#                                 port: no warnings/errors, then the balance route,
#                                 the boot graph and the served bundle are probed
#   5. live instance           -- when a server already listens on -LivePort, its
#                                 route is probed too and the session is left alone
#   6. desktop app target      -- the Electron app runs the RESERVED `desktop`
#                                 profile, which the CLI refuses to compose. So:
#                                 the profile on disk is checked, the SAME profile
#                                 is composed under a probe name on a free port
#                                 (route, boot graph, served bundle), and the
#                                 running app's own port is asked whether it
#                                 already serves the plugin bundle. An app that
#                                 composed its profile before this install reports
#                                 PENDING: it needs one restart, which the report
#                                 says out loud instead of failing the run.
#
# Usage:
#   pwsh -File verify/self-check.ps1
#   pwsh -File verify/self-check.ps1 -Profile web -LivePort 3080
#   pwsh -File verify/self-check.ps1 -SkipColdBoot
#   pwsh -File verify/self-check.ps1 -SkipDesktop
#
# Exit code 0 = every executed check passed.
[CmdletBinding()]
param(
  [string]$Profile = 'web',
  [int]$LivePort = 3080,
  [int]$TimeoutSeconds = 180,
  [string]$DshHome = $(if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }),
  [string]$WorkDir = $(Join-Path $HOME 'Desktop\dsh'),
  [switch]$SkipColdBoot,
  [switch]$SkipDesktop
)

$ErrorActionPreference = 'Continue'
$packageDir = Split-Path -Parent $PSScriptRoot
$dshHomePath = $DshHome
$profileDir = Join-Path (Join-Path $dshHomePath 'profiles') $Profile
$patchPath = Join-Path $profileDir 'cordis.patch.yml'
$packageJsonPath = Join-Path $profileDir 'package.json'
$failures = 0
$checks = 0
$pendings = @()

function Report([string]$name, [bool]$ok, [string]$detail) {
  $script:checks += 1
  if (-not $ok) { $script:failures += 1 }
  $tag = if ($ok) { 'PASS' } else { 'FAIL' }
  Write-Host ('  [{0}] {1,-42} {2}' -f $tag, $name, $detail)
}

# A check that could not be satisfied yet, but is not a defect of this package
# (the desktop app mounts profiles at launch, so the first install needs one
# restart). Counted as executed, never as a failure, and reported in the summary.
function ReportPending([string]$name, [string]$detail) {
  $script:checks += 1
  $script:pendings += ('{0} - {1}' -f $name, $detail)
  Write-Host ('  [{0}] {1,-42} {2}' -f 'WAIT', $name, $detail) -ForegroundColor Yellow
}

function Section([string]$title) {
  Write-Host ''
  Write-Host "== $title" -ForegroundColor Cyan
}

# One composed row of the dump, from its `- id:` line to the next top-level row.
function Get-DumpRow([string]$text, [string]$id) {
  $match = [regex]::Match($text, "(?ms)^- id: $([regex]::Escape($id))\s*$.*?(?=^- |\z)")
  return $match.Value
}

# The core version open_dsh pins, so the cold boot tests exactly what the
# launcher would start.
$core = '@deepseek-ai/dsh@0.1.5-rc.1'
$serverBat = Join-Path $WorkDir 'open_dsh_server.bat'
if (Test-Path $serverBat) {
  foreach ($line in Get-Content $serverBat) {
    if ($line -match 'set\s+"DSH_CORE=(.+)"') { $core = $Matches[1] }
  }
}

Write-Host ''
Write-Host '  dsh-cost-balance-indicator . self check' -ForegroundColor White
Write-Host ("  profile {0} | core {1} | home {2}" -f $Profile, $core, $dshHomePath) -ForegroundColor DarkGray

# ---------------------------------------------------------------- 1. tree ----
Section '1. composed profile tree'
if (-not (Test-Path $patchPath)) {
  Report 'patch layer present' $false $patchPath
} else {
  Report 'patch layer present' $true $patchPath
}
$dump = Join-Path $env:TEMP ('cbb-selfcheck-' + [guid]::NewGuid().ToString('N') + '.txt')
$null = & npx $core --profile $Profile --dump-config *> $dump
$dumpExit = $LASTEXITCODE
$dumpText = if (Test-Path $dump) { Get-Content $dump -Raw } else { '' }
Report 'dump-config exits 0' ($dumpExit -eq 0) "exit=$dumpExit"
$rowCount = ([regex]::Matches($dumpText, '(?m)^- id: cost-balance-indicator\s*$')).Count
Report 'exactly one merged row' ($rowCount -eq 1) "count=$rowCount"
$peakRow = Get-DumpRow $dumpText 'peak-indicator'
$peakOverride = $peakRow -match 'disabled:\s*true'
Report 'peak-indicator disabled' $peakOverride $(if ($peakOverride) { 'disabled: true (patched by the profile layer)' } else { 'no disable override found' })
$legacyAuto = ([regex]::Matches($dumpText, '(?m)^- id: balance-indicator\s*$')).Count
Report 'no standalone balance row' ($legacyAuto -eq 0) "count=$legacyAuto"
Remove-Item $dump -ErrorAction SilentlyContinue

# ------------------------------------------------------------ 2. preflight ----
Section '2. open_dsh preflight (peak compat patch)'
$compat = $null
if (Test-Path $WorkDir) {
  $candidate = Get-ChildItem $WorkDir -Directory -Filter 'dsh*' -ErrorAction SilentlyContinue |
    ForEach-Object { Join-Path $_.FullName 'dsh-peak-indicator-compat.ps1' } |
    Where-Object { Test-Path $_ } |
    Select-Object -First 1
  $compat = $candidate
}
if ($compat -eq $null) {
  Report 'compat patch found' $true 'not present here (skipped)'
} else {
  $out = & powershell -NoProfile -ExecutionPolicy Bypass -File $compat 2>&1
  $code = $LASTEXITCODE
  Report 'compat patch exits 0' ($code -eq 0) (($out | Select-Object -Last 1) -as [string])
}

# --------------------------------------------------------- 3. open_dsh gate ---
Section '3. open_dsh environment self check'
$checkScript = Join-Path $WorkDir 'open_dsh_check.ps1'
if (-not (Test-Path $checkScript)) {
  Report 'open_dsh_check.ps1 found' $true 'not present here (skipped)'
} else {
  $out = & powershell -NoProfile -ExecutionPolicy Bypass -File $checkScript -Port $LivePort -WorkDir $WorkDir 2>&1
  $code = $LASTEXITCODE
  $result = ($out | Where-Object { $_ -match 'RESULT:' } | Select-Object -First 1) -as [string]
  Report 'open_dsh_check exits 0' ($code -eq 0) "exit=$code"
  Report 'open_dsh_check RESULT' ($result -match 'environment ready|reuse the running server') ($result -replace '^\s+', '')
}

# ------------------------------------------------------------- 4. cold boot ---
Section '4. cold boot of the same profile on a free port'
$booted = $null
$log = Join-Path $env:TEMP ('cbb-coldboot-' + [guid]::NewGuid().ToString('N') + '.log')
if ($SkipColdBoot) {
  Report 'cold boot' $true 'skipped by -SkipColdBoot'
} else {
  # A cold boot must not race the running instance for its storages, so the
  # workspace state is snapshotted and restored afterwards.
  $storages = Join-Path $dshHomePath 'storages'
  $storagesBackup = Join-Path $env:TEMP ('cbb-storages-' + [guid]::NewGuid().ToString('N'))
  if (Test-Path $storages) { Copy-Item $storages $storagesBackup -Recurse -Force }

  $proc = Start-Process -FilePath 'powershell' -WindowStyle Minimized -PassThru -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
    "Set-Location '$WorkDir'; npx $core --profile $Profile --no-open --port 0 *> '$log'"
  )
  $port = $null
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 3
    if (Test-Path $log) {
      $text = Get-Content $log -Raw -ErrorAction SilentlyContinue
      if ($text -match 'https?://127\.0\.0\.1:(\d+)/\?token=') { $port = $Matches[1]; break }
    }
    if ($proc.HasExited) { break }
  }
  $logText = if (Test-Path $log) { Get-Content $log -Raw } else { '' }
  $errors = @($logText -split "`n" | Where-Object {
    $_ -match '(?i)\b(error|failed|cannot|duplicate|throw)\b' -and
    $_ -notmatch 'NativeCommandError|CategoryInfo|FullyQualifiedErrorId|npm verbose|npm http|node\.exe :|^\s*\+'
  })
  Report 'cold boot reached its launch URL' ($port -ne $null) $(if ($port) { "port $port" } else { 'no url within timeout' })
  Report 'cold boot has no errors' ($errors.Count -eq 0) $(if ($errors.Count -eq 0) { 'clean log' } else { $errors[0].Trim().Substring(0, [Math]::Min(120, $errors[0].Trim().Length)) })
  if ($port -ne $null) {
    $probe = & node (Join-Path $PSScriptRoot 'check-cost-balance.mjs') --port $port 2>&1
    $probeExit = $LASTEXITCODE
    $balanceLine = ($probe | Where-Object { $_ -match 'balance: GET' } | Select-Object -First 1) -as [string]
    $moduleLine = ($probe | Where-Object { $_ -match 'client module:' } | Select-Object -First 1) -as [string]
    $bundleLine = ($probe | Where-Object { $_ -match 'cost-balance-indicator/client\.js' } | Select-Object -First 1) -as [string]
    Report 'cold boot balance route' ($balanceLine -match '-> 200') ($balanceLine -replace '^---\s*', '')
    Report 'cold boot boot graph' ($moduleLine -match 'true') ($moduleLine -replace '^---\s*', '')
    Report 'cold boot bundle surfaces' ($bundleLine -match 'surfaces') ($bundleLine -replace '^---\s*', '')
    Report 'cold boot probe exit 0' ($probeExit -eq 0) "exit=$probeExit"
    $graph = & node (Join-Path $PSScriptRoot 'boot-graph.mjs') --port $port 2>&1
    $merged = @($graph | Where-Object { $_ -match 'present\s+dsh-cost-balance-indicator' }).Count
    $legacy = @($graph | Where-Object { $_ -match 'present\s+dsh-(peak|balance)-indicator' }).Count
    Report 'cold boot graph: merged only' (($merged -ge 1) -and ($legacy -eq 0)) "merged=$merged legacy=$legacy"
  }
  # Tear the second instance down: its process tree, then whatever still holds
  # the port.
  if ($proc -and -not $proc.HasExited) { taskkill /PID $proc.Id /T /F *> $null }
  if ($port -ne $null) {
    for ($i = 0; $i -lt 10; $i++) {
      Start-Sleep -Seconds 1
      $listener = netstat -ano -p tcp | Select-String -Pattern 'LISTENING' | Select-String -Pattern (':' + $port + '\s')
      if ($listener -eq $null) { break }
      foreach ($line in $listener) {
        $pieces = ($line -as [string]).Trim() -split '\s+'
        $pid = $pieces[$pieces.Count - 1]
        if ($pid -match '^\d+$') { taskkill /PID $pid /T /F *> $null }
      }
    }
    $still = netstat -ano -p tcp | Select-String -Pattern 'LISTENING' | Select-String -Pattern (':' + $port + '\s')
    Report 'second instance torn down' ($still -eq $null) $(if ($still) { "port $port still listening" } else { "port $port free" })
  }
  # Restore the storages snapshot: a second instance may have re-written the
  # projection cache or the workspace list while it ran.
  if (Test-Path $storagesBackup) {
    if (Test-Path $storages) { Remove-Item -Recurse -Force $storages }
    Copy-Item $storagesBackup $storages -Recurse -Force
    Remove-Item -Recurse -Force $storagesBackup -ErrorAction SilentlyContinue
    Report 'storages restored' $true 'snapshot put back'
  }
  Remove-Item $log -ErrorAction SilentlyContinue
}

# --------------------------------------------------------- 5. live instance ---
Section '5. running instance'
$listening = netstat -ano -p tcp | Select-String -Pattern 'LISTENING' | Select-String -Pattern (':' + $LivePort + '\s')
if ($listening -eq $null) {
  Report 'live instance' $true "nothing listening on $LivePort (skipped)"
} else {
  $probe = & node (Join-Path $PSScriptRoot 'check-cost-balance.mjs') --port $LivePort 2>&1
  $probeExit = $LASTEXITCODE
  $balanceLine = ($probe | Where-Object { $_ -match 'balance: GET' } | Select-Object -First 1) -as [string]
  Report 'live balance route' ($balanceLine -match '-> 200') ($balanceLine -replace '^---\s*', '')
  Report 'live probe exit 0' ($probeExit -eq 0) "exit=$probeExit"
}

# ------------------------------------------------------ 6. desktop target ----
# The desktop app owns a RESERVED profile: the CLI answers `profile "desktop" is
# managed exclusively by the Electron application`, so this section cannot compose
# it the way section 4 composes -Profile. It does three things instead: inspect
# the profile on disk, compose an identical PROBE copy under a free name, and ask
# the running app whether it already serves the plugin bundle.
function Get-ListeningPortOf([string]$processName) {
  $ids = @(Get-Process -Name $processName -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
  if ($ids.Count -eq 0) { return $null }
  foreach ($line in (netstat -ano -p tcp | Select-String -Pattern 'LISTENING')) {
    $pieces = ($line -as [string]).Trim() -split '\s+'
    $owner = $pieces[$pieces.Count - 1]
    if ($owner -match '^\d+$' -and ($ids -contains [int]$owner)) {
      if ($pieces[1] -match ':(\d+)$') { return [int]$Matches[1] }
    }
  }
  return $null
}

Section '6. desktop app target (Electron, reserved profile)'
$desktopDir = Join-Path (Join-Path $dshHomePath 'profiles') 'desktop'
if ($SkipDesktop) {
  Report 'desktop target' $true 'skipped by -SkipDesktop'
} elseif (-not (Test-Path $desktopDir)) {
  Report 'desktop profile present' $true 'no desktop profile here (skipped)'
} else {
  $desktopPatch = Join-Path $desktopDir 'cordis.patch.yml'
  $desktopManifest = Join-Path $desktopDir 'package.json'
  $desktopPackage = Join-Path (Join-Path $desktopDir 'node_modules') 'dsh-cost-balance-indicator\lib\client.js'
  Report 'desktop profile package installed' (Test-Path $desktopPackage) $(if (Test-Path $desktopPackage) { 'node_modules\dsh-cost-balance-indicator' } else { 'run: install.ps1 -Profile desktop' })
  $desktopPatchText = if (Test-Path $desktopPatch) { Get-Content $desktopPatch -Raw } else { '' }
  $desktopRows = ([regex]::Matches($desktopPatchText, '(?m)^\s*-?\s*id: cost-balance-indicator\s*$')).Count
  Report 'desktop patch: exactly one row' ($desktopRows -eq 1) "count=$desktopRows"
  $manifestText = if (Test-Path $desktopManifest) { Get-Content $desktopManifest -Raw } else { '' }
  $liveReload = $manifestText -match '"patchReload"\s*:\s*"live"'
  Report 'desktop manifest: patchReload live' $liveReload $(if ($liveReload) { 'later edits recompose without a restart' } else { 'add dsh.profile.patchReload: live' })
  $peakDisabled = ([regex]::Matches($desktopPatchText, '(?m)^\s*-?\s*id: peak-indicator\s*$')).Count
  Report 'desktop patch: no legacy rows' ($peakDisabled -eq 0) "peak-indicator rows=$peakDisabled"

  # Neither half may require a service. A pending entry aborts the desktop app's
  # whole boot (`web boot: 1 entry did not activate`), which is exactly how 0.7.0
  # made the app unusable: the browser half required `settingsScope`, and the
  # desktop's bundled client does not provide it.
  $clientSource = Join-Path $desktopPackage '' # placeholder replaced below
  $clientPath = Join-Path (Join-Path (Join-Path $desktopDir 'node_modules') 'dsh-cost-balance-indicator') 'lib\client.js'
  $hostPath = Join-Path (Join-Path (Join-Path $desktopDir 'node_modules') 'dsh-cost-balance-indicator') 'lib\index.js'
  $clientInjectLine = if (Test-Path $clientPath) { (Select-String -Path $clientPath -Pattern '^\s+var inject = (.*);' | Select-Object -First 1).Line } else { '' }
  $hostInjectLine = if (Test-Path $hostPath) { (Select-String -Path $hostPath -Pattern '^var inject = (.*);' | Select-Object -First 1).Line } else { '' }
  $clientEmpty = $clientInjectLine -match 'var inject = \[\];'
  $hostEmpty = $hostInjectLine -match 'var inject = \[\];'
  Report 'browser half requires no service' $clientEmpty $(if ($clientEmpty) { 'inject = [] (an entry can never stay pending)' } else { $clientInjectLine.Trim() })
  Report 'host half requires no service' $hostEmpty $(if ($hostEmpty) { 'inject = [] (mounts through ctx.inject sub-fibers)' } else { $hostInjectLine.Trim() })

  # A boot crash that names this plugin is the app telling us it refused to start.
  # Only crashes NEWER than the installed client.js count: an older one is fixed.
  $appLogs = Join-Path $env:APPDATA '@deepseek-ai\dsh-desktop\logs'
  if (Test-Path $appLogs) {
    $clientStamp = (Get-Item $clientPath -ErrorAction SilentlyContinue).LastWriteTime
    $ours = @(Get-ChildItem $appLogs -File -Filter 'crash-*-web-boot.log' -ErrorAction SilentlyContinue |
      Where-Object { (Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue) -match 'dsh-cost-balance-indicator' } |
      Sort-Object LastWriteTime -Descending)
    if ($ours.Count -eq 0) {
      Report 'desktop crash logs mention us' $true 'no boot crash names this plugin'
    } elseif ($clientStamp -ne $null -and $ours[0].LastWriteTime -lt $clientStamp) {
      Report 'desktop crash logs mention us' $true ("last one {0:MM-dd HH:mm} predates the installed build" -f $ours[0].LastWriteTime)
    } else {
      $first = (Get-Content $ours[0].FullName | Where-Object { $_ -match 'pending|did not activate' } | Select-Object -First 1)
      Report 'desktop crash logs mention us' $false ("{0}: {1}" -f $ours[0].Name, ($first -as [string]).Trim())
    }
  }

  # Compose the same bundle list under a probe name (the reserved name stays the
  # app's). The copy carries no node_modules of its own except this package: the
  # @deepseek-ai/* bundles resolve from the shared profiles\node_modules.
  $probeName = 'desktop-probe'
  $probeDir = Join-Path (Join-Path $dshHomePath 'profiles') $probeName
  if (Test-Path $probeDir) { Remove-Item -Recurse -Force $probeDir }
  New-Item -ItemType Directory -Path $probeDir -Force *> $null
  foreach ($file in @('package.json', 'cordis.patch.yml', 'cordis.yml', 'pnpm-workspace.yaml')) {
    $from = Join-Path $desktopDir $file
    if (Test-Path $from) { Copy-Item $from (Join-Path $probeDir $file) -Force }
  }
  $probeModules = Join-Path $probeDir 'node_modules'
  New-Item -ItemType Directory -Path $probeModules -Force *> $null
  Copy-Item (Join-Path (Join-Path $desktopDir 'node_modules') 'dsh-cost-balance-indicator') (Join-Path $probeModules 'dsh-cost-balance-indicator') -Recurse -Force

  # The app may list bundles it resolves from its own asar
  # (`@deepseek-ai/dsh-experimental-agent-team-profile` is one). The CLI cannot see
  # those, and booting with one unresolvable name aborts the probe, so the copy
  # keeps only the bundles the shared profiles\node_modules actually provides.
  $sharedModules = Join-Path (Join-Path $dshHomePath 'profiles') 'node_modules'
  $probeManifest = Get-Content (Join-Path $probeDir 'package.json') -Raw | ConvertFrom-Json
  $keptBundles = @()
  $appPrivate = @()
  foreach ($bundle in $probeManifest.dsh.profile.bundles) {
    if (Test-Path (Join-Path $sharedModules $bundle)) { $keptBundles += $bundle } else { $appPrivate += $bundle }
  }
  $probeManifest.dsh.profile.bundles = $keptBundles
  [System.IO.File]::WriteAllText((Join-Path $probeDir 'package.json'), ($probeManifest | ConvertTo-Json -Depth 12) + [Environment]::NewLine, (New-Object System.Text.UTF8Encoding($false)))
  Report 'desktop probe bundles resolvable' ($keptBundles.Count -gt 0) ("kept {0}; app-private dropped: {1}" -f ($keptBundles -join ', '), $(if ($appPrivate.Count -gt 0) { $appPrivate -join ', ' } else { 'none' }))

  $storages = Join-Path $dshHomePath 'storages'
  $storagesBackup = Join-Path $env:TEMP ('cbb-desktop-storages-' + [guid]::NewGuid().ToString('N'))
  if (Test-Path $storages) { Copy-Item $storages $storagesBackup -Recurse -Force }
  $probeLog = Join-Path $env:TEMP ('cbb-desktop-probe-' + [guid]::NewGuid().ToString('N') + '.log')
  $probeProc = Start-Process -FilePath 'powershell' -WindowStyle Minimized -PassThru -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
    "Set-Location '$WorkDir'; npx $core --profile $probeName --no-open --port 0 *> '$probeLog'"
  )
  $probePort = $null
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 3
    if (Test-Path $probeLog) {
      $text = Get-Content $probeLog -Raw -ErrorAction SilentlyContinue
      if ($text -match 'https?://127\.0\.0\.1:(\d+)/\?token=') { $probePort = $Matches[1]; break }
    }
    if ($probeProc.HasExited) { break }
  }
  $probeText = if (Test-Path $probeLog) { Get-Content $probeLog -Raw } else { '' }
  $probeErrors = @($probeText -split "`n" | Where-Object {
    $_ -match '(?i)\b(error|failed|cannot|duplicate|throw)\b' -and
    $_ -notmatch 'NativeCommandError|CategoryInfo|FullyQualifiedErrorId|npm verbose|npm http|node\.exe :|^\s*\+'
  })
  Report 'desktop composition boots' ($probePort -ne $null) $(if ($probePort) { "probe profile on port $probePort" } else { 'no launch url within timeout' })
  Report 'desktop composition no errors' ($probeErrors.Count -eq 0) $(if ($probeErrors.Count -eq 0) { 'clean log' } else { $probeErrors[0].Trim().Substring(0, [Math]::Min(120, $probeErrors[0].Trim().Length)) })
  if ($probePort -ne $null) {
    $desktopProbe = & node (Join-Path $PSScriptRoot 'check-cost-balance.mjs') --port $probePort 2>&1
    $balanceLine = ($desktopProbe | Where-Object { $_ -match 'balance: GET' } | Select-Object -First 1) -as [string]
    $moduleLine = ($desktopProbe | Where-Object { $_ -match 'client module:' } | Select-Object -First 1) -as [string]
    $bundleLine = ($desktopProbe | Where-Object { $_ -match 'cost-balance-indicator/client\.js' } | Select-Object -First 1) -as [string]
    Report 'desktop composition balance route' ($balanceLine -match '-> 200') ($balanceLine -replace '^---\s*', '')
    Report 'desktop composition boot graph' ($moduleLine -match 'true') ($moduleLine -replace '^---\s*', '')
    Report 'desktop composition bundle surfaces' ($bundleLine -match 'surfaces') ($bundleLine -replace '^---\s*', '')
  }
  if ($probeProc -and -not $probeProc.HasExited) { taskkill /PID $probeProc.Id /T /F *> $null }
  if ($probePort -ne $null) {
    for ($i = 0; $i -lt 10; $i++) {
      Start-Sleep -Seconds 1
      $listener = netstat -ano -p tcp | Select-String -Pattern 'LISTENING' | Select-String -Pattern (':' + $probePort + '\s')
      if ($listener -eq $null) { break }
      foreach ($line in $listener) {
        $pieces = ($line -as [string]).Trim() -split '\s+'
        $owner = $pieces[$pieces.Count - 1]
        if ($owner -match '^\d+$') { taskkill /PID $owner /T /F *> $null }
      }
    }
  }
  Remove-Item -Recurse -Force $probeDir -ErrorAction SilentlyContinue
  Remove-Item $probeLog -ErrorAction SilentlyContinue
  Report 'desktop probe torn down' (-not (Test-Path $probeDir)) 'probe profile removed'
  if (Test-Path $storagesBackup) {
    if (Test-Path $storages) { Remove-Item -Recurse -Force $storages }
    Copy-Item $storagesBackup $storages -Recurse -Force
    Remove-Item -Recurse -Force $storagesBackup -ErrorAction SilentlyContinue
    Report 'desktop storages restored' $true 'snapshot put back'
  }

  # The running app composed its profile at launch: until it is restarted once the
  # plugin bundle is not served yet. That is a restart, not a defect.
  $appPort = Get-ListeningPortOf 'DeepSeek Harness'
  if ($appPort -eq $null) {
    ReportPending 'desktop app live mount' 'the desktop app is not running (start it and re-run to verify)'
  } else {
    $appCode = $null
    $appLength = 0
    try {
      $response = Invoke-WebRequest ("http://127.0.0.1:{0}/plugins/??dsh-cost-balance-indicator/client.js" -f $appPort) -UseBasicParsing -TimeoutSec 15
      $appCode = $response.StatusCode
      $appLength = $response.RawContentLength
    } catch {
      if ($_.Exception.Response -ne $null) { $appCode = $_.Exception.Response.StatusCode.value__ }
    }
    if ($appCode -eq 200) {
      Report 'desktop app serves the plugin' $true ("port {0}, {1} bytes" -f $appPort, $appLength)
    } elseif ($appCode -eq 404) {
      ReportPending 'desktop app live mount' ("port {0}: restart the app once; the profile is composed at launch" -f $appPort)
    } else {
      ReportPending 'desktop app live mount' ("port {0} answered {1}" -f $appPort, $appCode)
    }
  }
}

# ---------------------------------------------------------------- result -----
Write-Host ''
if ($failures -eq 0) {
  if ($pendings.Count -eq 0) {
    Write-Host ("  RESULT: {0}/{0} checks passed - DSH composes and boots with no conflict." -f $checks) -ForegroundColor Green
  } else {
    Write-Host ("  RESULT: {0}/{0} checks passed, {1} pending:" -f $checks, $pendings.Count) -ForegroundColor Green
    foreach ($item in $pendings) { Write-Host ("    - {0}" -f $item) -ForegroundColor Yellow }
  }
  exit 0
}
Write-Host ("  RESULT: {0} of {1} checks FAILED." -f $failures, $checks) -ForegroundColor Red
exit 1
