[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$checks = [Collections.Generic.List[object]]::new()
function Add-Check([string] $Name, [bool] $Ready, [string] $Detail) {
    $checks.Add([pscustomobject]@{ Check = $Name; Ready = $Ready; Detail = $Detail })
}

$programFilesX86 = ${env:ProgramFiles(x86)}
$vswhereCommand = Get-Command vswhere.exe -ErrorAction SilentlyContinue | Select-Object -First 1
$vswhere = if ($vswhereCommand) {
    $vswhereCommand.Source
} else {
    Join-Path $programFilesX86 'Microsoft Visual Studio\Installer\vswhere.exe'
}
$vsPath = $null
$vsInstanceVersion = $null
if (Test-Path -LiteralPath $vswhere) {
    $vsJson = & $vswhere -products '*' -latest -version '[18.0,19.0)' -format json -utf8
    $vs = @($vsJson | ConvertFrom-Json) | Select-Object -First 1
    if ($vs) {
        $vsPath = [string] $vs.installationPath
        $vsInstanceVersion = [string] $vs.installationVersion
    }
}
Add-Check 'Visual Studio 2026 (18.x)' ([bool] $vsPath) ($vsPath ?? 'No 18.x instance found by vswhere.')

$mfcHeader = $null
$linker = $null
if ($vsPath) {
    $msvcRoot = Join-Path $vsPath 'VC\Tools\MSVC'
    foreach ($toolset in Get-ChildItem -LiteralPath $msvcRoot -Directory -ErrorAction SilentlyContinue) {
        $candidateMfc = Join-Path $toolset.FullName 'atlmfc\include\afxwin.h'
        $candidateLinker = Join-Path $toolset.FullName 'bin\Hostx64\x64\link.exe'
        if (-not $mfcHeader -and (Test-Path -LiteralPath $candidateMfc)) { $mfcHeader = $candidateMfc }
        if (-not $linker -and (Test-Path -LiteralPath $candidateLinker)) { $linker = $candidateLinker }
    }
}
Add-Check 'MSVC linker' ([bool] $linker) ($linker ?? 'link.exe missing under the selected VS instance.')
Add-Check 'MFC/ATL headers' ([bool] $mfcHeader) ($mfcHeader ?? 'afxwin.h missing; install Microsoft.VisualStudio.Component.VC.ATLMFC.')

$kitsRegistry = Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows Kits\Installed Roots' -Name KitsRoot10 -ErrorAction SilentlyContinue
$kitsRootValue = if ($kitsRegistry) { [string] $kitsRegistry.KitsRoot10 } else { $null }
$kitsRoot = if ($kitsRootValue) {
    $kitsRootValue
} else {
    Join-Path $programFilesX86 'Windows Kits\10'
}
$sdkVersion = '10.0.28000.0'
$sdkInclude = Join-Path $kitsRoot "Include\$sdkVersion\um\Windows.h"
$sdkLibrary = Join-Path $kitsRoot "Lib\$sdkVersion\um\x64\kernel32.lib"
Add-Check 'Windows SDK 10.0.28000' ((Test-Path -LiteralPath $sdkInclude) -and (Test-Path -LiteralPath $sdkLibrary)) $sdkVersion

$debugger = Join-Path $kitsRoot 'Debuggers\x64\cdb.exe'
$debuggerVersion = if (Test-Path -LiteralPath $debugger) { (Get-Item -LiteralPath $debugger).VersionInfo.FileVersion } else { $null }
$debuggerReady = $false
if ($debuggerVersion) {
    try {
        $debuggerVersionPart = ($debuggerVersion -split '\s+')[0]
        $debuggerReady = ([version] $debuggerVersionPart) -ge ([version] '10.0.26100.3323')
    } catch { }
}
Add-Check 'Windows SDK Debugging Tools >= 10.0.26100.3323' $debuggerReady ($debuggerVersion ?? 'cdb.exe missing.')

foreach ($tool in @('git', 'gclient', 'gn', 'autoninja')) {
    $resolved = Get-Command $tool -ErrorAction SilentlyContinue | Select-Object -First 1
    Add-Check $tool ([bool] $resolved) ($resolved.Source ?? 'Not found on PATH.')
}

$depotToolsPath = (Get-Command gclient -ErrorAction SilentlyContinue | Select-Object -First 1).Source
$pathFirst = $false
$pathDetail = 'depot_tools could not be located from gclient.'
if ($depotToolsPath) {
    $depotToolsDirectory = Split-Path -Parent $depotToolsPath
    $resolvedPython = & where.exe python3 2>$null | Select-Object -First 1
    $resolvedGit = & where.exe git 2>$null | Select-Object -First 1
    $pythonIsDepotTools = $resolvedPython -and ((Split-Path -Parent $resolvedPython) -ieq $depotToolsDirectory)
    $gitIsDepotTools = $resolvedGit -and ((Split-Path -Parent $resolvedGit) -ieq $depotToolsDirectory)
    $pathFirst = [bool] ($pythonIsDepotTools -and $gitIsDepotTools)
    $pathDetail = "python3=$resolvedPython; git=$resolvedGit"
}
Add-Check 'depot_tools Python/Git precedence' $pathFirst $pathDetail
Add-Check 'DEPOT_TOOLS_WIN_TOOLCHAIN=0' ($env:DEPOT_TOOLS_WIN_TOOLCHAIN -eq '0') ($env:DEPOT_TOOLS_WIN_TOOLCHAIN ?? 'Not set in this process.')

$checks | Format-Table -AutoSize
$missing = @($checks | Where-Object { -not $_.Ready })
if ($missing.Count -gt 0) {
    Write-Host "`nWindows Chromium/MSVC prerequisites missing: $($missing.Count). See docs/windows-toolchains.md." -ForegroundColor Yellow
    exit 1
}
Write-Host "`nWindows Chromium/MSVC host prerequisites detected (Visual Studio $vsInstanceVersion). Check the pinned checkout's own build guide before building." -ForegroundColor Green
