# Cross-compiling `bunre` with Zig

`bunre` cross-compiles from Windows to Linux with Zig and `cargo-zigbuild`.
The BunCC tool provider can install the Rust Cargo subcommand when BunCC is
available:

```powershell
zig version
buncc install cargo-zigbuild --run
```

Build glibc-compatible release binaries for x86-64 and ARM64:

```powershell
cargo zigbuild --locked -p yolo-re-core --bin bunre --release --target x86_64-unknown-linux-gnu.2.28
cargo zigbuild --locked -p yolo-re-core --bin bunre --release --target aarch64-unknown-linux-gnu.2.28
```

The resulting ELF executables are under
`target/<triple>/release/bunre` (or the configured `CARGO_TARGET_DIR`). Both
targets were cross-compiled with Zig 0.17 and recognized by `bunre` triage as
ELF64 with the requested architecture. Cross-compiling does not run the Linux
executables; deploy them to a matching Linux host to exercise them there.
