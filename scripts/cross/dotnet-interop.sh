#!/usr/bin/env bash
# Bash mirror of dotnet-interop.ps1: build the Rust cdylib + .NET solution and
# run the demo. Flags: --aot (NativeAOT win-x64), --linux (cargo-zigbuild .so +
# dotnet publish -r linux-x64), --skip-rust.
set -euo pipefail

CONFIG=Release
AOT=0; LINUX=0; SKIP_RUST=0
for a in "$@"; do case "$a" in
  --debug) CONFIG=Debug ;;
  --release) CONFIG=Release ;;
  --aot) AOT=1 ;;
  --linux) LINUX=1 ;;
  --skip-rust) SKIP_RUST=1 ;;
  *) echo "unknown arg: $a" >&2; exit 2 ;;
esac; done

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(dirname "$here")"
dn="$root/dotnet"
crate="$dn/native/yolo_interop"
manifest="$crate/Cargo.toml"
target="$crate/target"

if [ "$SKIP_RUST" != 1 ]; then
  echo "== cargo build --release (x86_64-pc-windows-msvc) =="
  cargo build --release --manifest-path "$manifest" --target-dir "$target"
fi

echo "== dotnet build =="
dotnet build "$dn/YoloCross.slnx" -c "$CONFIG"

exe="$dn/src/YoloCross.Cli/bin/$CONFIG/net10.0/yolo-cross-dotnet.exe"
echo "== run $exe =="
"$exe" || echo "CLI exit code: $?"

if [ "$LINUX" = 1 ]; then
  echo "== cargo zigbuild -> linux-x64 .so =="
  cargo zigbuild --release --target x86_64-unknown-linux-gnu --manifest-path "$manifest" --target-dir "$target"
  echo "== dotnet publish -r linux-x64 =="
  dotnet publish "$dn/src/YoloCross.Cli/YoloCross.Cli.csproj" -c "$CONFIG" -r linux-x64 --self-contained false -o "$dn/publish/linux-x64"
fi

if [ "$AOT" = 1 ]; then
  # NativeAOT needs vswhere (VS Installer dir) on PATH to find the MSVC linker.
  installer="/c/Program Files (x86)/Microsoft Visual Studio/Installer"
  [ -d "$installer" ] && export PATH="$installer:$PATH"
  echo "== dotnet publish -r win-x64 -p:PublishAot=true =="
  dotnet publish "$dn/src/YoloCross.Cli/YoloCross.Cli.csproj" -c "$CONFIG" -r win-x64 -p:PublishAot=true -o "$dn/publish/win-x64-aot"
fi

echo "Done."
