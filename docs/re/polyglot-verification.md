# Polyglot verification

Run `bun run check:polyglot` or `just polyglot-check` from the repository root. This is a
non-installing qualification pass across the independent language owners. It builds only local
workspace outputs and does not install or upgrade dependencies, invoke tests, modify a game target,
or create/update Python environments.

The command reports one `PASS`, `FAIL`, or `SKIP` per check, prints each subprocess exit status, and
returns exit code 1 when a command fails or a required environment is missing. A skipped check is
never counted as a pass. The configured CMake build is optional; when no supported CMake cache is
present, it is reported as an optional skip. Exit code 0 means all required checks passed, not that
optional CMake compilation ran.

Checks:

- `cargo check --workspace --locked` validates the Rust workspace without running Rust tests.
- `bun run re --help`, direct REA `providers --format json`, and `bun run replica skills` exercise
  the root Bun CLI adapters and validate REA's read-only provider inventory without imposing
  machine-specific MCP installation/configuration state.
- REA's own `check:fast` script runs its type and lint checks and its declared dependency preflight;
  it does not run REA tests or install dependencies.
- `uv lock --check --project src/py` checks the Python lockfile. The existing project venv is called
  directly for the CLI help and `yolo-re-py ghidra doctor`, so this entrypoint does not invoke
  `uv run` or synchronize packages. The Ghidra check fails if its JSON response is not ready.
- `dotnet build apps/iecode-dotnet/IECODE.sln --no-restore --configuration Debug` builds the .NET
  solution only when the canonical solution is present and avoids NuGet restore.
- CMake builds only an already-configured `packages/iecode-cpp/build` or
  `packages/iecode-cpp/out/build` tree. Configure that build explicitly with the required vcpkg
  feature before expecting C++ qualification; absent caches are reported as skipped.
- Google Magika is exercised through its already-present upstream Python environment and the REA
  bridge on the checked-in README. The inference result is checked rather than treating an import as
  model readiness. No Magika environment is created by this command.

Each result prints its exit status and up to 5,000 trailing characters of subprocess output, so a
large compiler log cannot hide the final summary. A required check skipped due to a missing toolchain
leaves the repository unqualified until that toolchain is available and the command is rerun.

## IECODE NativeAOT on Windows x64

The FFI and Core projects have separate `packages.aot.win-x64.lock.json` files for the AOT compiler
and runtime. Use an explicit `RuntimeIdentifier` property for restore and publication:

```powershell
dotnet restore apps/iecode-dotnet/Ffi/IECODE.Ffi.csproj --locked-mode -p:RuntimeIdentifier=win-x64 -p:PublishAot=true
dotnet publish apps/iecode-dotnet/Ffi/IECODE.Ffi.csproj --no-restore -c Debug -p:RuntimeIdentifier=win-x64 -p:PublishAot=true
```

The Debug DLL has been loaded with Bun FFI and CRILAYLA round trips were verified. This does not
establish AOT compatibility for all IECODE features: the build reports reflection and JSON trimming
warnings. ImageSharp requires a valid license configuration for Release builds. Other runtime
identifiers require their own reviewed AOT lockfiles.
