// Minimal C++ consumer that links the vcpkg-provided {fmt} library.
// Build after `vcpkg install` (see scripts/vcpkg/README.md). Demonstrates
// MSVC C++ toolchain + vcpkg manifest-mode dependency consumption.
#include <fmt/core.h>

int main() {
    fmt::print("yolo-cross vcpkg + MSVC: {} (fmt {}.{}.{})\n",
               "fmt linked from a vcpkg manifest",
               FMT_VERSION / 10000, (FMT_VERSION % 10000) / 100, FMT_VERSION % 100);
    return 0;
}
