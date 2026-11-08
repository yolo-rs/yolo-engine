#Requires -Version 7.0
<#
.SYNOPSIS
    Detect (and, only with -Install, install) the Windows C#/.NET + MSVC
    cross-compilation toolchain used by yolo-cross dotnet/.

.DESCRIPTION
    Idempotent. By default it ONLY detects and reports what is present; it
    changes nothing. Pass -Install to install missing LIGHT packages via winget.
    Heavy Visual Studio Build Tools are additionally gated behind
    -InstallBuildTools so a multi-GB install never happens by accident.

    This script NEVER enrols the machine in the Windows Insider program and
    never changes release channels. Insider/preview enrolment is a manual,
    user-driven action: https://learn.microsoft.com/windows-insider/flighting

    Every winget package Id below is taken from official Microsoft Learn docs
    (URLs in comments) and was confirmed to resolve with `winget search`.

.PARAMETER Install
    Install missing light packages (.NET SDK, PowerShell 7, Windows Terminal,
    vcpkg) via winget. Without this switch the script only reports.

.PARAMETER InstallBuildTools
    Additionally allow installing Visual Studio Build Tools + MSVC + Windows 11
    SDK (large). Requires -Install too. Off by default.

.PARAMETER IncludePreview
    When installing, prefer preview/canary channels (PowerShell Preview,
    Windows Terminal Preview, .NET SDK Preview). Detection always reports
    preview builds regardless of this switch.

.EXAMPLE
    pwsh -File scripts/setup-windows-dev.ps1
    # Detect-and-report only (safe; default).

.EXAMPLE
    pwsh -File scripts/setup-windows-dev.ps1 -Install
    # Install missing light tools; Build Tools still skipped.
#>
[CmdletBinding()]
param(
    [switch]$Install,
    [switch]$InstallBuildTools,
    [switch]$IncludePreview
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# --- winget package Ids (verified against Microsoft Learn) --------------------
# .NET SDK:        https://learn.microsoft.com/dotnet/core/install/windows
# PowerShell:      https://learn.microsoft.com/powershell/scripting/install/install-powershell-on-windows
# Windows Terminal:https://learn.microsoft.com/windows/terminal/install
# VS Build Tools:  https://learn.microsoft.com/cpp/overview/acquire-msvc
# VS components:   https://learn.microsoft.com/visualstudio/install/workload-component-id-vs-build-tools
$Ids = @{
    DotNetSdk          = if ($IncludePreview) { 'Microsoft.DotNet.SDK.Preview' } else { 'Microsoft.DotNet.SDK.10' }
    PowerShell         = if ($IncludePreview) { 'Microsoft.PowerShell.Preview' } else { 'Microsoft.PowerShell' }
    WindowsTerminal    = if ($IncludePreview) { 'Microsoft.WindowsTerminal.Preview' } else { 'Microsoft.WindowsTerminal' }
    # VS 2026 (v18) Build Tools on the Release channel. For VS 2022 (v17) use
    # Microsoft.VisualStudio.2022.BuildTools. Insiders: *.Enterprise.Insiders.
    BuildTools         = 'Microsoft.VisualStudio.BuildTools'
    # Component Ids passed to the VS installer via --add.
    VcToolsComponent   = 'Microsoft.VisualStudio.Component.VC.Tools.x86.x64'   # MSVC v143/Latest x64/x86
    Win11SdkComponent  = 'Microsoft.VisualStudio.Component.Windows11SDK.26100' # Windows 11 SDK 26100
    VcToolsWorkload    = 'Microsoft.VisualStudio.Workload.VCTools'             # "Desktop development with C++"
}

$script:Report = [System.Collections.Generic.List[object]]::new()

function Add-Row([string]$Tool, [string]$Status, [string]$Detail, [string]$Action = '') {
    $script:Report.Add([pscustomobject]@{ Tool = $Tool; Status = $Status; Detail = $Detail; Action = $Action })
}

function Test-WingetAvailable {
    return [bool](Get-Command winget -ErrorAction SilentlyContinue)
}

function Invoke-WingetInstall([string]$Id, [switch]$Allow) {
    if (-not $Allow) {
        Write-Host "  [skip] would install '$Id' (pass -Install to perform)" -ForegroundColor Yellow
        return 'install-guarded'
    }
    if (-not (Test-WingetAvailable)) {
        Write-Warning "winget not available; cannot install $Id"
        return 'winget-missing'
    }
    Write-Host "  [install] winget install --id $Id --exact --silent" -ForegroundColor Cyan
    winget install --id $Id --exact --silent --accept-package-agreements --accept-source-agreements
    return "exit=$LASTEXITCODE"
}

function Find-VisualStudio {
    $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
    if (-not (Test-Path $vswhere)) { return @() }
    # -prerelease so Insider/preview VS 2026 instances are also discovered.
    $json = & $vswhere -all -prerelease -products '*' -format json 2>$null
    if (-not $json) { return @() }
    return $json | ConvertFrom-Json
}

Write-Host "yolo-cross Windows dev toolchain - detect-and-report" -ForegroundColor Green
Write-Host "(install actions require -Install; Build Tools also need -InstallBuildTools)`n"

# --- .NET SDK -----------------------------------------------------------------
$dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
if ($dotnet) {
    $sdks = (& dotnet --list-sdks) -join '; '
    Add-Row '.NET SDK' 'present' $sdks
} else {
    $act = Invoke-WingetInstall $Ids.DotNetSdk -Allow:$Install
    Add-Row '.NET SDK' 'MISSING' "would use $($Ids.DotNetSdk)" $act
}

# --- PowerShell 7 -------------------------------------------------------------
$pwsh = Get-Command pwsh -ErrorAction SilentlyContinue
if ($pwsh) {
    Add-Row 'PowerShell 7' 'present' "pwsh $($PSVersionTable.PSVersion) on .NET $([System.Environment]::Version)"
} else {
    $act = Invoke-WingetInstall $Ids.PowerShell -Allow:$Install
    Add-Row 'PowerShell 7' 'MISSING' "would use $($Ids.PowerShell)" $act
}

# --- Windows Terminal ---------------------------------------------------------
$wt = Get-AppxPackage -Name 'Microsoft.WindowsTerminal*' -ErrorAction SilentlyContinue
if ($wt) {
    Add-Row 'Windows Terminal' 'present' (($wt | ForEach-Object { "$($_.Name) $($_.Version)" }) -join '; ')
} else {
    $act = Invoke-WingetInstall $Ids.WindowsTerminal -Allow:$Install
    Add-Row 'Windows Terminal' 'MISSING' "would use $($Ids.WindowsTerminal)" $act
}

# --- Visual Studio Build Tools (via vswhere) ----------------------------------
$vs = Find-VisualStudio
if ($vs -and $vs.Count -gt 0) {
    foreach ($i in $vs) {
        $pre = if ($i.isPrerelease) { ' (prerelease/Insiders)' } else { '' }
        Add-Row 'VS Build Tools' 'present' "$($i.displayName) $($i.installationVersion) [$($i.channelId)]$pre"
    }
} else {
    $act = 'install-guarded'
    if ($Install -and $InstallBuildTools) {
        $act = Invoke-WingetInstall $Ids.BuildTools -Allow:$true
        # Add the C++ workload + MSVC v143 + Windows 11 SDK via the VS installer:
        #   winget install --id $($Ids.BuildTools) --override "--passive --add $($Ids.VcToolsWorkload) --add $($Ids.VcToolsComponent) --add $($Ids.Win11SdkComponent)"
    } else {
        Write-Host "  [skip] Build Tools install gated behind -Install -InstallBuildTools (multi-GB)" -ForegroundColor Yellow
    }
    Add-Row 'VS Build Tools' 'MISSING' "would use $($Ids.BuildTools) + $($Ids.VcToolsComponent)" $act
}

# --- MSVC v143 toolset (cl.exe) ----------------------------------------------
$msvc = @()
foreach ($i in $vs) {
    $vcRoot = Join-Path $i.installationPath 'VC\Tools\MSVC'
    if (Test-Path $vcRoot) {
        $msvc += Get-ChildItem $vcRoot -Directory -ErrorAction SilentlyContinue |
            Where-Object { Test-Path (Join-Path $_.FullName 'bin\Hostx64\x64\cl.exe') } |
            ForEach-Object { $_.Name }
    }
}
if ($msvc.Count -gt 0) {
    Add-Row 'MSVC toolset' 'present' ("cl.exe toolsets: " + ($msvc -join ', '))
} else {
    Add-Row 'MSVC toolset' 'MISSING' "install via Build Tools component $($Ids.VcToolsComponent)" 'install-guarded'
}

# --- Windows 11 SDK -----------------------------------------------------------
$sdkLib = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\Lib'
if (Test-Path $sdkLib) {
    $builds = Get-ChildItem $sdkLib -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like '10.*' } | ForEach-Object { $_.Name }
    Add-Row 'Windows 11 SDK' 'present' ("builds: " + ($builds -join ', '))
} else {
    Add-Row 'Windows 11 SDK' 'MISSING' "install via Build Tools component $($Ids.Win11SdkComponent)" 'install-guarded'
}

# --- vcpkg --------------------------------------------------------------------
$vcpkg = Get-Command vcpkg -ErrorAction SilentlyContinue
if ($vcpkg) {
    $ver = (& vcpkg version 2>$null | Select-Object -First 1)
    Add-Row 'vcpkg' 'present' "$($vcpkg.Source) ($ver)"
} else {
    # vcpkg is not a winget package; it is cloned + bootstrapped.
    # https://learn.microsoft.com/vcpkg/get_started/get-started
    if ($Install) {
        $dest = Join-Path $env:USERPROFILE 'vcpkg'
        Write-Host "  [install] git clone https://github.com/microsoft/vcpkg $dest; & $dest\bootstrap-vcpkg.bat" -ForegroundColor Cyan
        if (-not (Test-Path $dest)) { git clone https://github.com/microsoft/vcpkg $dest }
        & (Join-Path $dest 'bootstrap-vcpkg.bat')
        Add-Row 'vcpkg' 'MISSING' 'cloned + bootstrapped' "installed to $dest"
    } else {
        Add-Row 'vcpkg' 'MISSING' 'git clone microsoft/vcpkg + bootstrap-vcpkg.bat' 'install-guarded'
    }
}

# --- Canary / preview channels (report only; never enrol) ---------------------
Write-Host "`nBleeding-edge channels (reported; enrolment is manual and never done here):" -ForegroundColor Green
Write-Host "  Windows 11 Insider (Canary/Dev): https://learn.microsoft.com/windows-insider/flighting  [manual enrol]"
Write-Host "  Windows Terminal Preview : winget Microsoft.WindowsTerminal.Preview"
Write-Host "  Windows Terminal Canary  : install from Microsoft Store / GitHub (not in winget here)"
Write-Host "  PowerShell Preview       : winget Microsoft.PowerShell.Preview"
Write-Host "  VS 2026 Insiders         : winget Microsoft.VisualStudio.Enterprise.Insiders (channel VisualStudio.18.Preview)"
Write-Host "  .NET 11 preview / nightly: dotnet-install -Channel 11.0 -Quality preview|daily -InstallDir .dotnet"
Write-Host "    https://learn.microsoft.com/dotnet/core/tools/dotnet-install-script"

Write-Host "`n==== Toolchain report ====" -ForegroundColor Green
$script:Report | Format-Table -AutoSize

$missing = @($script:Report | Where-Object { $_.Status -eq 'MISSING' })
Write-Host ("`n{0} present, {1} missing." -f (($script:Report | Where-Object { $_.Status -eq 'present' }).Count), $missing.Count)
if ($missing.Count -gt 0 -and -not $Install) {
    Write-Host "Re-run with -Install to install the light missing tools (Build Tools also need -InstallBuildTools)." -ForegroundColor Yellow
}
