# Bun 1.4 and native toolchain policy

This workspace uses upstream Bun as its JavaScript runtime. Runtime packages support Bun 1.4.4 and newer; root development tasks pin `bun@1.4.4-canary.1` because native `bun lint` and `bun check --aot` are absent from the stable 1.4.4 binary. Performance work must be measured against the same upstream Bun version and workload; package adapters do not claim to improve Bun's runtime itself.

## Bun quality and compilation

The root `bun run check`, `bun run fmt`, and `bun run lint` tasks use Bun's native checker, formatter, and linter over the active package catalog and root orchestrator. `bun run aot:check` uses `bun check --aot` on each declared CLI entry point. `bun run aot:explain` adds `--explain` to inspect slow compiler paths. These are static compatibility checks: they build no executable and are not runtime benchmarks.

For a real AOT executable, Bun 1.4 exposes `bun build --compile --aot`. AOT output is experimental and tied to the host platform and Bun version, so CI must build and run it on each target OS/architecture. Keep the ordinary `bun build --compile --target=...` path for cross-target executables; that path embeds JavaScript and uses the JIT. Do not promise AOT compatibility for a package until its AOT build and runtime behavior have both been checked. Where launch latency matters, compare AOT with the ordinary executable and warmed upstream Bun using the actual production workload.

Use Bun's native APIs when they provide the needed behavior (`Bun.file`, `Bun.spawn`, `Bun.Glob`, `Bun.semver`, `Bun.TOML`, and the built-in test runner), while keeping Node-compatible imports where compatibility is part of the public API. Keep package code on the supported Bun 1.4 API surface; do not patch the runtime to move those APIs into the core.

## Rust and cross-target optimization

The root release profile already enables Cargo LTO (`lto = true`, which selects fat LTO); the distribution profile uses thin LTO. This favors whole-program optimization without imposing one host CPU's instruction set on every target. `target-cpu=native` is not a default: it can produce artifacts that fail on older deployment CPUs and defeats portable cross-compilation. Add target CPU features only through an explicit target profile after selecting and documenting the minimum supported ISA.

```sh
cargo build --release --target <triple>
cargo build --profile dist --target <triple>
```

Measure changes to LTO, codegen units, stripping, or panic behavior against representative CLI and library workloads before making them defaults. Cross compilation must keep the target's ABI, CRT, linker, sysroot, and CPU baseline explicit. Windows MSVC, MinGW, Linux GNU/musl, Android, and WebAssembly remain distinct target lanes.

## Validation boundaries

- Bun `check`, `fmt`, and `lint` validate the active TypeScript/JavaScript package sources.
- `aot:check` identifies source that Bun's AOT compiler would reject; it does not create or execute a binary.
- Cargo check on Windows validates host compilation only. It does not prove that Android, Linux, Windows cross-target, or WebAssembly artifacts build.
- Runtime parity means benchmark results against the matching upstream Bun release, on the same hardware and workload. No parity claim is made without those results.

## Upstream references

- [Bun compiler overview](https://bun.sh/docs/compiler)
- [Bun ahead-of-time compilation](https://bun.sh/docs/compiler/aot)
- [Bun executable targets](https://bun.sh/docs/compiler/executables)
- [Bun AOT compatibility](https://bun.sh/docs/compiler/compatibility)
- [Bun `check`](https://bun.sh/docs/runtime/check)
- [Bun native APIs](https://bun.sh/docs/runtime/bun-apis)
