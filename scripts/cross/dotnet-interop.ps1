#Requires -Version 7.0
<#
.SYNOPSIS
    Build the Rust cdylib + the .NET solution and run the interop demo.
.DESCRIPTION
    One command to reproduce the whole dotnet/ pipeline. Optional switches add
    the Linux cross-publish (cargo-zigbuild + dotnet publish -r linux-x64) and
    the NativeAOT win-x64 publish.
.PARAMETER Aot    Also produce the NativeAOT win-x64 native exe.
.PARAMETER Linux  Also cross-build the .so (cargo-zigbuild) + publish -r linux-x64.
.PARAMETER SkipRust  Skip the cargo build step (use an existing cdylib).
#>
[CmdletBinding()]
param(
    [ValidateSet('Debug', 'Release')][string]$Configuration = 'Release',
    [switch]$Aot,
    [switch]$Linux,
    [switch]$SkipRust
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root  = Split-Path -Parent $PSScriptRoot
$dn    = Join-Path $root 'dotnet'
$crate = Join-Path $dn 'native\yolo_interop'
$manifest = Join-Path $crate 'Cargo.toml'
$targetDir = Join-Path $crate 'target'   # deterministic, overrides any global CARGO target dir

if (-not $SkipRust) {
    Write-Host '== cargo build --release (x86_64-pc-windows-msvc) ==' -ForegroundColor Cyan
    cargo build --release --manifest-path $manifest --target-dir $targetDir
}

Write-Host '== dotnet build ==' -ForegroundColor Cyan
dotnet build (Join-Path $dn 'YoloCross.slnx') -c $Configuration

$exe = Join-Path $dn "src\YoloCross.Cli\bin\$Configuration\net10.0\yolo-cross-dotnet.exe"
Write-Host "== run $exe ==" -ForegroundColor Cyan
& $exe
Write-Host "CLI exit code: $LASTEXITCODE"

if ($Linux) {
    Write-Host '== cargo zigbuild -> linux-x64 .so ==' -ForegroundColor Cyan
    cargo zigbuild --release --target x86_64-unknown-linux-gnu --manifest-path $manifest --target-dir $targetDir
    Write-Host '== dotnet publish -r linux-x64 (framework-dependent) ==' -ForegroundColor Cyan
    dotnet publish (Join-Path $dn 'src\YoloCross.Cli\YoloCross.Cli.csproj') -c $Configuration -r linux-x64 --self-contained false -o (Join-Path $dn 'publish\linux-x64')
}

if ($Aot) {
    # NativeAOT's link step shells out to vswhere.exe to locate the MSVC linker
    # environment; make sure the VS Installer dir (which holds vswhere) is on PATH.
    $installer = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer'
    if ((Test-Path $installer) -and (($env:PATH -split ';') -notcontains $installer)) {
        $env:PATH = "$installer;$env:PATH"
    }
    Write-Host '== dotnet publish -r win-x64 -p:PublishAot=true ==' -ForegroundColor Cyan
    dotnet publish (Join-Path $dn 'src\YoloCross.Cli\YoloCross.Cli.csproj') -c $Configuration -r win-x64 -p:PublishAot=true -o (Join-Path $dn 'publish\win-x64-aot')
}

Write-Host 'Done.' -ForegroundColor Green
