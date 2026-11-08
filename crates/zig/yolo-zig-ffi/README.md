# yolo-zig-ffi

Rust bindings for the versioned `yolo-zig` C ABI. This small crate wraps the
ABI version, target OS, and target architecture functions declared in
`include/yolo_zig.h`.

The native shared library is opt-in. Build it for the target and enable the
crate feature when linking a Rust consumer:

```powershell
zig build -Dtarget=x86_64-windows-msvc -Doptimize=ReleaseFast
$env:YOLO_ZIG_LIB_DIR = (Resolve-Path zig-out/lib).Path
cargo add yolo-zig-ffi --features link-yolo-zig
```

With the feature enabled, `runtime_info()` validates the ABI version and
returns the target reported by the exact library loaded by the Rust binary.
The crate does not bundle or rebuild Zig, so consumers control Zig's compiler,
target, optimization flags, and native library deployment.
