---
name: cpp-cmake-vcpkg
description: Modern C++20, C17/libc, CMake presets, and vcpkg development, diagnostics, and debugging skill. Use when working on C++20 (concepts, ranges, coroutines, modules, span, format), C / libc runtime and FFI bridges, CMake targets/presets/toolchains, vcpkg dependency management (manifest mode, overlays, triplets), Clang tooling (clangd, clang-tidy, clang-format, ASan, UBSan), or low-level native components in IECODE (`src/iecode-cpp`, `CMakeLists.txt`, `CMakePresets.json`, `vcpkg.json`).
---

# Modern C++20, C, libc, CMake & vcpkg Skill

Expert engineering guidance and automated runbooks for modern C++20, ISO C17, libc ABI/FFI boundaries, CMake presets, and vcpkg manifest management across Linux (GCC 13 / Clang 18) and cross-platform targets.

---

## 1. Modern C++20 Standards & Idioms

### Core C++20 Standards in Force

- **Concepts & Constraints**: Replace SFINAE with readable `template <typename T> requires ...` or `template <std::integral T>`.
- **Ranges & Views**: Use `std::ranges::views::transform`, `filter`, and range algorithms (`std::ranges::sort`, `std::ranges::find_if`) without explicit `.begin()`/`.end()`.
- **Three-Way Comparison (Spaceship `<=>`)**: Default operator `<=>` with `auto operator<=>(const T&) const = default;` for structural types.
- **Span & String View**: Use `std::span<const uint8_t>` for non-owning byte buffers and `std::string_view` for string parameters. Never pass raw pointers with separate length parameters in modern C++.
- **Bit Operations & Endianness**: Use `<bit>` (`std::endian::native`, `std::byteswap`, `std::bit_cast`, `std::rotr`, `std::rotl`).
- **Formatting**: `std::format` / `fmt` (vcpkg `fmt::format`) instead of `sprintf` or heavy `std::stringstream`.
- **Smart Pointers & Ownership**: `std::unique_ptr` by default, `std::shared_ptr` only when multiple ownership is required. Never use raw `new` / `delete`.

### Concurrency & Coroutines

- `std::jthread` (auto-joining, cooperative cancellation via `std::stop_token`).
- `std::atomic<T>` and `std::atomic_ref<T>`.
- Coroutines (`co_await`, `co_yield`, `co_return`) for asynchronous I/O and streaming pipelines.

---

## 2. ISO C17 & libc Architecture

### Safety and Portability

- **Standard Types**: Strictly `<stdint.h>` (`uint8_t`, `uint32_t`, `int64_t`, `uintptr_t`, `size_t`). Never assume `long` or `int` sizes across platforms.
- **Bounds-Checking & String Safety**: Never use `strcpy` or `sprintf`. Use `snprintf`, bounded buffers, or length-checked abstractions.
- **ABI / FFI Contracts**:
  - Stable C ABI for cross-language bridges (Rust, C#, Bun `bun:ffi`, WebAssembly).
  - Explicit calling conventions: `extern "C"` with `#ifdef __cplusplus`.
  - Struct packing and alignment: `alignas(...)` or `#pragma pack(push, 1)` only when matching binary disk/network formats, with explicit static asserts:
    ```cpp
    static_assert(sizeof(Header) == 0x20, "Header size mismatch");
    static_assert(offsetof(Header, magic) == 0x00, "Header offset mismatch");
    ```

---

## 3. CMake Best Practices (Version >= 3.25)

### Target-Based Modern CMake

- **Never** use directory-level commands (`include_directories()`, `link_directories()`, `add_definitions()`).
- Always define explicit targets and use scoped requirements:
  ```cmake
  add_library(mylib STATIC ...)
  target_compile_features(mylib PUBLIC cxx_std_20)
  target_include_directories(mylib
      PUBLIC
          $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
          $<INSTALL_INTERFACE:include>
      PRIVATE
          ${CMAKE_CURRENT_SOURCE_DIR}/src
  )
  target_link_libraries(mylib
      PUBLIC
          fmt::fmt
          nlohmann_json::nlohmann_json
      PRIVATE
          ZLIB::ZLIB
  )
  ```
- Use `set(CMAKE_EXPORT_COMPILE_COMMANDS ON)` to produce `compile_commands.json` for `clangd`.

### CMake Presets (`CMakePresets.json`)

Run builds using presets rather than manual flag combinations:

```bash
# Configure with Ninja + vcpkg toolchain
cmake --preset iecode-cpp-debug

# Build
cmake --build --preset iecode-cpp-debug

# Test
ctest --preset iecode-cpp-debug
```

---

## 4. vcpkg Dependency Management (Manifest Mode)

### Manifest Structure (`vcpkg.json`)

Maintain dependencies declaratively in root `vcpkg.json`:

- Specify features cleanly (e.g. `cpp-httplib` with `openssl`).
- Maintain `builtin-baseline` to pin exact commits.
- Run `vcpkg integrate install` or use `-DCMAKE_TOOLCHAIN_FILE=${VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake`.

### Common Commands

```bash
# Inspect installed / outdated packages
vcpkg x-update-baseline --dry-run

# Format vcpkg.json
vcpkg format-manifest vcpkg.json
```

---

## 5. Clang Tooling & Static Analysis

### Clang-Tidy

Execute configured checks against compile commands:

```bash
clang-tidy -p build/iecode-cpp-debug src/iecode-cpp/src/core/my_file.cpp
```

Configured in `.clang-tidy`:

- `modernize-*`, `bugprone-*`, `performance-*`, `cppcoreguidelines-*`.
- Enforces `nullptr`, `override`, member suffix `_`, and camelCase/snake_case consistency.

### Clang-Format

Enforce code formatting matching `.clang-format`:

```bash
clang-format -i src/iecode-cpp/src/core/my_file.cpp
```

### Sanitizers (ASan, UBSan, TSan)

In Debug CMake configurations:

```cmake
target_compile_options(mylib PRIVATE -fsanitize=address,undefined -fno-omit-frame-pointer)
target_link_options(mylib PRIVATE -fsanitize=address,undefined)
```

---

## 6. Project Reference: `src/iecode-cpp`

In this workspace:

- Root CMake presets define `vcpkg-base`, `debug`, `release`, and `iecode-cpp-debug`.
- Native code is organized under `src/iecode-cpp/src/`:
  - `core/`: binary stream, memory, endian utilities.
  - `crypto/`: CRC32, hashes, encryption ciphers.
  - `formats/`: CRI CPK, Level-5 RDBN (`cfg.bin`), CRILAYLA compression.
  - `emulation/`: MelonDS/Dust integration bridges.
- Headers are placed in `src/iecode-cpp/src/include/`.
