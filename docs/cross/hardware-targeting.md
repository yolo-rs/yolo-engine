# CPU-aware cross compilation

`cross` can opt into a portable x86-64 ISA baseline with the target's
`--target-cpu-profile` option:

```powershell
cross build --target x86_64-unknown-linux-gnu --target-cpu-profile x86-64-v3
cross build --target x86_64-pc-windows-msvc --target-cpu-profile x86-64-v2
```

Supported profiles are `x86-64-v1`, `x86-64-v2`, `x86-64-v3`, and
`x86-64-v4`. The target triple must use `x86_64`. The profile is mapped by the
`yolo-hardware` crate and passed to Cargo as `-C target-cpu=...`; Cargo then
applies it while compiling the selected target from the Cross container.

The setting is explicit. Cross does not use the build host's CPU model as the
deployment target, because that can produce binaries that fail on older target
machines. The selected profile replaces Cargo's `build.rustflags` for that
invocation. Omit this option to retain the project's own Cargo configuration
and its portable default.

OS, target triple, linker, SDK and ABI remain controlled by Cross, cargo-xwin,
and cargo-zigbuild. The hardware catalog supplies CPU ISA profile names; it
does not guess an OS toolchain or download platform SDKs. For hardware catalog
queries, see the `yolo-hardware-db` package and its local PCI/USB/CPU/GPU data.
