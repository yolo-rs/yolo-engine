const builtin = @import("builtin");

pub const abi_version: u32 = 1;

pub fn targetOs() [:0]const u8 {
    return switch (builtin.os.tag) {
        .windows => "windows",
        .linux => "linux",
        .macos => "macos",
        .ios => "ios",
        .freebsd => "freebsd",
        .openbsd => "openbsd",
        .netbsd => "netbsd",
        .dragonfly => "dragonfly",
        .wasi => "wasi",
        .emscripten => "emscripten",
        .freestanding => "freestanding",
        else => "other",
    };
}

pub fn targetArch() [:0]const u8 {
    return @tagName(builtin.cpu.arch);
}

/// Stable C ABI version for consumers in Rust, Bun FFI, and native C/C++.
pub export fn yolo_zig_abi_version() callconv(.c) u32 {
    return abi_version;
}

/// Returns the target OS used to compile this library as a NUL-terminated C string.
pub export fn yolo_zig_target_os() callconv(.c) [*:0]const u8 {
    return targetOs();
}

/// Returns the target CPU architecture used to compile this library as a NUL-terminated C string.
pub export fn yolo_zig_target_arch() callconv(.c) [*:0]const u8 {
    return targetArch();
}
