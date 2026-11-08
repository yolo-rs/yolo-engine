//! Rust access to the versioned `yolo-zig` C ABI.
//!
//! Enable `link-yolo-zig` and set `YOLO_ZIG_LIB_DIR` to the output directory
//! produced by `zig build` to link the native shared library.

use core::fmt;

/// ABI version implemented by this crate.
pub const ABI_VERSION: u32 = 1;

/// Host information reported by the linked Zig library.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeInfo {
    pub abi_version: u32,
    pub target_os: String,
    pub target_arch: String,
}

/// Failure while reading or validating the native ABI.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Error {
    AbiVersion { expected: u32, actual: u32 },
    InvalidUtf8(&'static str),
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::AbiVersion { expected, actual } => {
                write!(f, "yolo-zig ABI mismatch: expected {expected}, got {actual}")
            }
            Self::InvalidUtf8(field) => write!(f, "yolo-zig returned non-UTF-8 {field}"),
        }
    }
}

impl std::error::Error for Error {}

#[cfg(feature = "link-yolo-zig")]
unsafe extern "C" {
    fn yolo_zig_abi_version() -> u32;
    fn yolo_zig_target_os() -> *const core::ffi::c_char;
    fn yolo_zig_target_arch() -> *const core::ffi::c_char;
}

/// Query ABI and compilation target information from the linked Zig library.
#[cfg(feature = "link-yolo-zig")]
pub fn runtime_info() -> Result<RuntimeInfo, Error> {
    // These pointers are static NUL-terminated strings by the yolo-zig C ABI.
    let abi_version = unsafe { yolo_zig_abi_version() };
    if abi_version != ABI_VERSION {
        return Err(Error::AbiVersion {
            expected: ABI_VERSION,
            actual: abi_version,
        });
    }
    let target_os = unsafe { core::ffi::CStr::from_ptr(yolo_zig_target_os()) }
        .to_str()
        .map_err(|_| Error::InvalidUtf8("target OS"))?
        .to_owned();
    let target_arch = unsafe { core::ffi::CStr::from_ptr(yolo_zig_target_arch()) }
        .to_str()
        .map_err(|_| Error::InvalidUtf8("target architecture"))?
        .to_owned();
    Ok(RuntimeInfo { abi_version, target_os, target_arch })
}
