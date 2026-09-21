# dsh-cost-balance-indicator installer.
#
# ASCII-only on purpose: Windows PowerShell 5.1 mis-decodes non-ASCII script text
# that has no BOM, and this file must run under both hosts.
#
# Installs the merged plugin into a dsh profile and retires the two plugins it
# merges, so no two rows ever register the same `peakCost` session projection:
#
#   1. copy this package into <profile>/node_modules/dsh-cost-balance-indicator
#   2. disable the bundle-provided `peak-indicator` row (adds `disabled: true`)
#   3. remove a `balance-indicator` row left by the standalone balance plugin
#   4. insert the `cost-balance-indicator` row (unless the profile lists this
#      package under dsh.profile.bundles, whose own patch already inserts it)
#
# Steps 2-4 are ordered deliberately and, when the profile still mounts a legacy
# row, split across TWO writes with a settle pause. Applying the disable and the
# new insert in one live edit races the old plugin's fibers: the old row still
# owns the `peakCost` projection and the `peakCompactStats` service while the new
# plugin applies, its apply aborts, and the browser half is left rendering a chip
# whose host route never registered. Retiring first and inserting second avoids
# that race without a restart.
#
# Profiles with `patchReload: live` (the shipped `web` profile) recompose each
# write without a restart; a `startup` profile picks the result up on its next
# launch, where the race does not exist at all.
#
#   pwsh -File install.ps1                      # install into the `web` profile
#   pwsh -File install.ps1 -Profile headless
#   pwsh -File install.ps1 -SettleSeconds 8     # slower machine / bigger profile
#   pwsh -File install.ps1 -Uninstall           # remove the merged row and package
#
# Every file this script edits is backed up under <profile>\.cost-balance-backup\
# before the first write.
[CmdletBinding()]
param(
  [string]$Profile = 'web',
  [string]$DshHome = $(if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }),
  [int]$SettleSeconds = 5,
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
$source = $PSScriptRoot
$profileDir = Join-Path (Join-Path $DshHome 'profiles') $Profile
$packageJsonPath = Join-Path $profileDir 'package.json'
$patchPath = Join-Path $profileDir 'cordis.patch.yml'
$installDir = Join-Path (Join-Path $profileDir 'node_modules') 'dsh-cost-balance-indicator'
$backupDir = Join-Path $profileDir '.cost-balance-backup'
$rowId = 'cost-balance-indicator'
$packageName = 'dsh-cost-balance-indicator'
$legacyPeak = 'peak-indicator'
$legacyBalance = 'balance-indicator'

if (-not (Test-Path $profileDir)) { throw "profile directory not found: $profileDir" }
if (-not (Test-Path $packageJsonPath)) { throw "profile manifest not found: $packageJsonPath" }

$insertLines = @(
  '- insert:',
  "    - id: $rowId",
  "      name: '$packageName'"
)
$disablePeakLines = @("- id: $legacyPeak", '  disabled: true')

# ---------------------------------------------------------------- helpers ----

function Read-PatchLines {
  if (-not (Test-Path $patchPath)) { return @() }
  return @(Get-Content -Path $patchPath)
}

function Write-PatchLines([string[]]$lines) {
  # A patch layer holding only comments parses to null, not to the empty array
  # the launcher expects, so always leave an explicit list behind.
  $meaningful = @($lines | Where-Object { $_.Trim() -ne '' -and -not $_.Trim().StartsWith('#') })
  if ($meaningful.Count -eq 0) { $lines = @($lines) + @('[]') }
  $text = ($lines -join "`n").TrimEnd() + "`n"
  # UTF-8 without a BOM under both PowerShell hosts; Set-Content -Encoding utf8
  # would add a BOM on 5.1.
  [System.IO.File]::WriteAllText($patchPath, $text, (New-Object System.Text.UTF8Encoding($false)))
}

function Backup-Once([string]$path) {
  if (-not (Test-Path $path)) { return }
  if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }
  $target = Join-Path $backupDir (Split-Path $path -Leaf)
  if (-not (Test-Path $target)) { Copy-Item $path $target }
}

# Index of the `- insert:` line opening the block that holds `- id: <id>`, or -1.
function Find-InsertStart([string[]]$lines, [string]$id) {
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -notmatch '^\s*- insert:\s*$') { continue }
    for ($j = $i + 1; $j -lt [Math]::Min($i + 4, $lines.Count); $j++) {
      if ($lines[$j] -match "^\s*- id:\s*$([regex]::Escape($id))\s*$") { return $i }
    }
  }
  return -1
}

# Index of a top-level `- id: <id>` row, or -1.
function Find-RowLine([string[]]$lines, [string]$id) {
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^\s*- id:\s*$([regex]::Escape($id))\s*$") { return $i }
  }
  return -1
}

# True when the patch layer already carries the peak row's disable override.
function Test-PeakDisabled([string[]]$lines) {
  $start = Find-RowLine $lines $legacyPeak
  if ($start -lt 0) { return $false }
  for ($j = $start + 1; $j -lt $lines.Count; $j++) {
    if ($lines[$j] -match '^\s*$') { break }
    if ($lines[$j] -match '^\s*-') { break }
    if ($lines[$j] -match '^\s*disabled:\s*true\s*$') { return $true }
  }
  return $false
}

# Remove a whole top-level row: `- id: X` plus its more-indented continuation,
# and the `- insert:` header when the row belonged to one.
function Remove-Row([string[]]$lines, [string]$id) {
  $start = Find-RowLine $lines $id
  if ($start -lt 0) { return $lines }
  $end = $start
  for ($j = $start + 1; $j -lt $lines.Count; $j++) {
    if ($lines[$j] -match '^\s*$') { break }
    if ($lines[$j] -match '^\s*-') { break }
    $end = $j
  }
  if ($start -gt 0 -and $lines[$start - 1] -match '^\s*- insert:\s*$') { $start -= 1 }
  $kept = @()
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($i -lt $start -or $i -gt $end) { $kept += $lines[$i] }
  }
  return $kept
}

# Append a top-level row, dropping the empty flow sequence the shipped template
# starts from and any trailing blank lines.
function Add-Row([string[]]$lines, [string[]]$rowLines) {
  $kept = @()
  foreach ($line in $lines) { if ($line.Trim() -ne '[]') { $kept += $line } }
  # Note that `$kept[0..-1]` is NOT an empty slice in PowerShell (it wraps back
  # to the last element), so trim one at a time.
  while ($kept.Count -gt 0 -and $kept[$kept.Count - 1].Trim() -eq '') {
    if ($kept.Count -eq 1) { $kept = @() } else { $kept = @($kept[0..($kept.Count - 2)]) }
  }
  return @($kept) + @('') + $rowLines
}

# The package ships its own bundle patch, so a profile that lists it under
# `dsh.profile.bundles` already gets the row inserted. Inserting it again in the
# profile patch layer is a hard boot failure: cordis refuses
# "duplicate loader entry id".
function Test-Bundled {
  try {
    $text = [System.IO.File]::ReadAllText($packageJsonPath, (New-Object System.Text.UTF8Encoding($false))).TrimStart([char]0xFEFF)
    $manifest = $text | ConvertFrom-Json
    return (@($manifest.dsh.profile.bundles) -contains $packageName)
  } catch {
    return $false
  }
}

# -------------------------------------------------------------- uninstall ----

if ($Uninstall) {
  Backup-Once $patchPath
  $lines = Read-PatchLines
  $hadMerged = (Find-InsertStart $lines $rowId) -ge 0
  $hadDisable = Test-PeakDisabled $lines
  # Phase 1: drop the merged row first, so its projection/service are gone
  # before the old plugin is allowed back.
  if ($hadMerged) {
    Write-PatchLines (Remove-Row $lines $rowId)
    if ($hadDisable) {
      Write-Host "phase 1/2: removed the $rowId row, waiting ${SettleSeconds}s before re-enabling $legacyPeak"
      Start-Sleep -Seconds $SettleSeconds
    }
  }
  # Phase 2: re-enable the old plugin.
  $lines = Read-PatchLines
  if ($hadDisable) {
    Write-PatchLines (Remove-Row $lines $legacyPeak)
    Write-Host "phase 2/2: re-enabled $legacyPeak"
  }
  if (Test-Path $installDir) {
    Remove-Item -Recurse -Force $installDir
    Write-Host "removed $installDir"
  }
  if (Test-Bundled) {
    Write-Host ''
    Write-Host "WARNING: this profile still lists '$packageName' under dsh.profile.bundles."
    Write-Host '         A listed bundle that is not installed fails startup, so remove that'
    Write-Host '         entry from package.json before starting dsh again.'
  }
  Write-Host 'Uninstalled. dsh-peak-indicator and dsh-balance-indicator are untouched.'
  return
}

# ---------------------------------------------------------------- install ----

# 1. Copy the package into the profile's node_modules. A plain directory is
#    enough: the loader resolves the row name relative to the profile.
if (-not (Test-Path $installDir)) { New-Item -ItemType Directory -Path $installDir | Out-Null }
foreach ($item in @('package.json', 'cordis.patch.yml', 'README.md', 'LICENSE', 'NOTICE')) {
  if (Test-Path (Join-Path $source $item)) { Copy-Item (Join-Path $source $item) $installDir -Force }
}
$installedLib = Join-Path $installDir 'lib'
if (Test-Path $installedLib) { Remove-Item -Recurse -Force $installedLib }
Copy-Item (Join-Path $source 'lib') $installDir -Recurse -Force
Write-Host "installed package -> $installDir"

Backup-Once $patchPath
$lines = Read-PatchLines
$bundled = Test-Bundled
$needsInsert = (-not $bundled) -and ((Find-InsertStart $lines $rowId) -lt 0)
$balancePresent = (Find-RowLine $lines $legacyBalance) -ge 0
$peakInstalled = Test-Path (Join-Path (Join-Path $profileDir 'node_modules') $legacyPeak)
$needsPeakDisable = $peakInstalled -and (-not (Test-PeakDisabled $lines))

if ($bundled) {
  if ((Find-InsertStart $lines $rowId) -ge 0) {
    Write-Host "removed the conflicting manual $rowId row (the profile mounts this package as a bundle)"
    $lines = Remove-Row $lines $rowId
  } else {
    Write-Host "the profile lists $packageName in dsh.profile.bundles: its bundle patch inserts the row"
  }
}

# 2. Retire the old rows, then mount the merged one.
if ($needsInsert -and ($needsPeakDisable -or $balancePresent)) {
  # Two writes: the old fibers must be gone before the merged plugin applies.
  if ($balancePresent) { $lines = Remove-Row $lines $legacyBalance }
  if ($needsPeakDisable) { $lines = Add-Row $lines $disablePeakLines }
  Write-PatchLines $lines
  Write-Host "phase 1/2: retired the old rows, waiting ${SettleSeconds}s for the live reload to settle"
  Start-Sleep -Seconds $SettleSeconds
  $lines = Read-PatchLines
  Write-PatchLines (Add-Row $lines $insertLines)
  Write-Host 'phase 2/2: mounted the merged row'
} else {
  if ($balancePresent) { $lines = Remove-Row $lines $legacyBalance }
  if ($needsPeakDisable) { $lines = Add-Row $lines $disablePeakLines }
  if ($needsInsert) { $lines = Add-Row $lines $insertLines }
  Write-PatchLines $lines
  if ($needsInsert) { Write-Host "mounted the plugin in $patchPath" }
  if ($needsPeakDisable -or $balancePresent) { Write-Host 'retired the old rows' }
  if (-not $needsInsert -and -not $needsPeakDisable -and -not $balancePresent) { Write-Host 'nothing to change: already installed' }
}

if ($bundled) {
  Write-Host ''
  Write-Host 'Note: this profile mounts the package as a bundle, so the disable and the'
  Write-Host '      insert share one composition. A cold start is race-free; a live reload'
  Write-Host '      may leave the chip without its host route until dsh is restarted.'
}

Write-Host ''
Write-Host 'Done. Header: merged spend+balance pill, then the billing-period pill on its right.'
Write-Host 'Turn tail: per-turn price chip, then the balance pill on its right.'
Write-Host 'Reload the browser (Ctrl+Shift+R) to pick up the new bundle.'
