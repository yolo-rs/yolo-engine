#!/usr/bin/env bash
# Bash mirror of setup-windows-dev.ps1 for Git Bash / MSYS on Windows.
# Detect-and-report by default; --install performs light winget installs.
# Heavy VS Build Tools are additionally gated behind --install-build-tools.
# Never enrols the machine in the Windows Insider program.
#
# winget Ids verified against Microsoft Learn (URLs inline). winget is callable
# from Git Bash on Windows.
set -euo pipefail

INSTALL=0
INSTALL_BT=0
INCLUDE_PREVIEW=0
for arg in "$@"; do
  case "$arg" in
    --install) INSTALL=1 ;;
    --install-build-tools) INSTALL_BT=1 ;;
    --include-preview) INCLUDE_PREVIEW=1 ;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

# https://learn.microsoft.com/dotnet/core/install/windows
ID_DOTNET=$([ "$INCLUDE_PREVIEW" = 1 ] && echo "Microsoft.DotNet.SDK.Preview" || echo "Microsoft.DotNet.SDK.10")
# https://learn.microsoft.com/powershell/scripting/install/install-powershell-on-windows
ID_PWSH=$([ "$INCLUDE_PREVIEW" = 1 ] && echo "Microsoft.PowerShell.Preview" || echo "Microsoft.PowerShell")
# https://learn.microsoft.com/windows/terminal/install
ID_WT=$([ "$INCLUDE_PREVIEW" = 1 ] && echo "Microsoft.WindowsTerminal.Preview" || echo "Microsoft.WindowsTerminal")
# https://learn.microsoft.com/cpp/overview/acquire-msvc  (VS 2026/v18 Build Tools)
ID_BT="Microsoft.VisualStudio.BuildTools"
# https://learn.microsoft.com/visualstudio/install/workload-component-id-vs-build-tools
ID_VC="Microsoft.VisualStudio.Component.VC.Tools.x86.x64"
ID_SDK="Microsoft.VisualStudio.Component.Windows11SDK.26100"

PF86="/c/Program Files (x86)"
pass=0; miss=0

row() { printf '  %-18s %-9s %s\n' "$1" "$2" "$3"; }
present() { pass=$((pass+1)); row "$1" "present" "$2"; }
missing() { miss=$((miss+1)); row "$1" "MISSING" "$2"; }

winget_install() { # $1=id
  if [ "$INSTALL" != 1 ]; then echo "    [skip] would: winget install --id $1 (pass --install)"; return; fi
  if ! command -v winget >/dev/null 2>&1; then echo "    [warn] winget not found"; return; fi
  echo "    [install] winget install --id $1 --exact --silent"
  winget install --id "$1" --exact --silent --accept-package-agreements --accept-source-agreements || true
}

echo "yolo-cross Windows dev toolchain - detect-and-report (bash mirror)"
echo "(install actions require --install; Build Tools also need --install-build-tools)"
echo

# .NET SDK
if command -v dotnet >/dev/null 2>&1; then
  present ".NET SDK" "$(dotnet --version 2>/dev/null) (SDKs: $(dotnet --list-sdks 2>/dev/null | tr '\n' ';'))"
else missing ".NET SDK" "would use $ID_DOTNET"; winget_install "$ID_DOTNET"; fi

# PowerShell 7
if command -v pwsh >/dev/null 2>&1; then
  present "PowerShell 7" "$(pwsh -NoProfile -c '$PSVersionTable.PSVersion.ToString()' 2>/dev/null)"
else missing "PowerShell 7" "would use $ID_PWSH"; winget_install "$ID_PWSH"; fi

# Windows Terminal
if command -v wt >/dev/null 2>&1 || ls "$HOME/AppData/Local/Microsoft/WindowsApps/wt.exe" >/dev/null 2>&1; then
  present "Windows Terminal" "wt launcher present"
else missing "Windows Terminal" "would use $ID_WT"; winget_install "$ID_WT"; fi

# Visual Studio Build Tools (via vswhere)
VSWHERE="$PF86/Microsoft Visual Studio/Installer/vswhere.exe"
VS_PRESENT=0
if [ -x "$VSWHERE" ]; then
  while IFS= read -r line; do
    present "VS Build Tools" "$line"; VS_PRESENT=1
  done < <("$VSWHERE" -all -prerelease -products '*' -property displayName 2>/dev/null | sed '/^$/d' | while read -r name; do echo "$name"; done)
fi
if [ "$VS_PRESENT" != 1 ]; then
  missing "VS Build Tools" "would use $ID_BT + $ID_VC"
  if [ "$INSTALL" = 1 ] && [ "$INSTALL_BT" = 1 ]; then winget_install "$ID_BT"; else echo "    [skip] Build Tools gated behind --install --install-build-tools (multi-GB)"; fi
fi

# MSVC toolset (cl.exe)
if ls "$PF86/Microsoft Visual Studio"/*/*/VC/Tools/MSVC/*/bin/Hostx64/x64/cl.exe >/dev/null 2>&1; then
  present "MSVC toolset" "$(ls -d "$PF86/Microsoft Visual Studio"/*/*/VC/Tools/MSVC/*/ 2>/dev/null | xargs -n1 basename | tr '\n' ' ')"
else missing "MSVC toolset" "install via Build Tools component $ID_VC"; fi

# Windows 11 SDK
if ls -d "$PF86/Windows Kits/10/Lib/10."* >/dev/null 2>&1; then
  present "Windows 11 SDK" "$(ls -d "$PF86/Windows Kits/10/Lib/10."* 2>/dev/null | xargs -n1 basename | tr '\n' ' ')"
else missing "Windows 11 SDK" "install via Build Tools component $ID_SDK"; fi

# vcpkg
if command -v vcpkg >/dev/null 2>&1; then
  present "vcpkg" "$(command -v vcpkg) ($(vcpkg version 2>/dev/null | head -1))"
else
  missing "vcpkg" "git clone microsoft/vcpkg + bootstrap"
  if [ "$INSTALL" = 1 ]; then
    dest="$HOME/vcpkg"
    [ -d "$dest" ] || git clone https://github.com/microsoft/vcpkg "$dest"
    "$dest/bootstrap-vcpkg.sh" || true
  fi
fi

echo
echo "Bleeding-edge channels (reported only; enrolment is manual, never performed here):"
echo "  Windows 11 Insider Canary/Dev : https://learn.microsoft.com/windows-insider/flighting"
echo "  Windows Terminal Preview      : winget Microsoft.WindowsTerminal.Preview"
echo "  Windows Terminal Canary       : Microsoft Store / GitHub (not in winget here)"
echo "  PowerShell Preview            : winget Microsoft.PowerShell.Preview"
echo "  VS 2026 Insiders              : winget Microsoft.VisualStudio.Enterprise.Insiders"
echo "  .NET 11 preview / nightly     : dotnet-install --channel 11.0 --quality preview|daily --install-dir .dotnet"
echo
echo "==== $pass present, $miss missing ===="
[ "$miss" -gt 0 ] && [ "$INSTALL" != 1 ] && echo "Re-run with --install for light tools (Build Tools also need --install-build-tools)." || true
exit 0
