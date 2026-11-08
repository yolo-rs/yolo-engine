# vcpkg C/C++ sample (manifest mode, MSVC)

A minimal [vcpkg manifest-mode](https://learn.microsoft.com/vcpkg/concepts/manifest-mode)
sample that installs a small C++ port (`fmt`) with the MSVC toolchain and links
it from `consumer.cpp`. It demonstrates the C/C++ side of the yolo-cross Windows
toolchain alongside the Rust and C# interop under `dotnet/`.

## Files
- `vcpkg.json` - the manifest; declares `fmt` as a dependency.
- `triplets/x64-windows-yolo.cmake` - a custom MSVC triplet (static libs,
  dynamic UCRT). See https://learn.microsoft.com/vcpkg/users/triplets
- `consumer.cpp` - tiny program that includes and calls `<fmt/core.h>`.

## Install dependencies (manifest mode)

```bash
# From this directory. vcpkg installs into ./vcpkg_installed/<triplet>/.
vcpkg install --triplet x64-windows --x-install-root=vcpkg_installed
# or with the custom MSVC triplet:
vcpkg install --overlay-triplets=triplets --triplet x64-windows-yolo --x-install-root=vcpkg_installed
```

`vcpkg install` with no package arguments reads `vcpkg.json`
(https://learn.microsoft.com/vcpkg/concepts/manifest-mode#installing-packages-in-manifest-mode).

## Build the consumer (clang-cl or MSVC cl), linking the installed fmt

```powershell
$inc = "vcpkg_installed/x64-windows/include"
$lib = "vcpkg_installed/x64-windows/lib"
clang-cl consumer.cpp /I $inc /link /LIBPATH:$lib fmt.lib
./consumer.exe
```

## MSBuild / Visual Studio integration

For MSBuild/.vcxproj projects, enable manifest mode by setting
`VcpkgEnableManifest=true` and the triplet via `VcpkgTriplet`
(https://learn.microsoft.com/vcpkg/users/buildsystems/msbuild-integration).
Global integration: `vcpkg integrate install`.
