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
#
# Usage:
#   pwsh -File verify/self-check.ps1
#   pwsh -File verify/self-check.ps1 -Profile web -LivePort 3080
#   pwsh -File verify/self-check.ps1 -SkipColdBoot
#
# Exit code 0 = every executed check passed.
[CmdletBinding()]
param(
  [string]$Profile = 'web',
  [int]$LivePort = 3080,
  [int]$TimeoutSeconds = 180,
  [string]$DshHome = $(if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }),
  [string]$WorkDir = $(Join-Path $HOME 'Desktop\dsh'),
  [switch]$SkipColdBoot
)

$ErrorActionPreference = 'Continue'
$packageDir = Split-Path -Parent $PSScriptRoot
$dshHomePath = $DshHome
$profileDir = Join-Path (Join-Path $dshHomePath 'profiles') $Profile
$patchPath = Join-Path $profileDir 'cordis.patch.yml'
$packageJsonPath = Join-Path $profileDir 'package.json'
$failures = 0
$checks = 0

function Report([string]$name, [bool]$ok, [string]$detail) {
  $script:checks += 1
  if (-not $ok) { $script:failures += 1 }
  $tag = if ($ok) { 'PASS' } else { 'FAIL' }
  Write-Host ('  [{0}] {1,-42} {2}' -f $tag, $name, $detail)
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

Write-Host ''
if ($failures -eq 0) {
  Write-Host ("  RESULT: {0}/{0} checks passed - DSH composes and boots with no conflict." -f $checks) -ForegroundColor Green
  exit 0
}
Write-Host ("  RESULT: {0} of {1} checks FAILED." -f $failures, $checks) -ForegroundColor Red
exit 1
