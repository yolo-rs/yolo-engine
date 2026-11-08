# Custom vcpkg MSVC triplet for yolo-cross.
# Static libraries linked against the DYNAMIC Universal CRT (the common choice
# for redistributable native deps that still link the system CRT dynamically).
# Docs: https://learn.microsoft.com/vcpkg/users/triplets
set(VCPKG_TARGET_ARCHITECTURE x64)
set(VCPKG_CRT_LINKAGE dynamic)
set(VCPKG_LIBRARY_LINKAGE static)

# Empty system name == native Windows build with the MSVC toolchain.
set(VCPKG_CMAKE_SYSTEM_NAME "")
