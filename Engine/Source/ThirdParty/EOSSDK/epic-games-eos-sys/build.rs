// SPDX-License-Identifier: MIT OR Apache-2.0
use std::env;
use std::path::PathBuf;

fn main() {
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    let include_dir = manifest_dir.join("..").join("Include");
    let src_file = manifest_dir.join("..").join("Src").join("eos_sdk_shim.c");

    println!("cargo:rerun-if-changed={}", include_dir.join("eos_sdk.h").display());
    println!("cargo:rerun-if-changed={}", include_dir.join("eos_sdk.hpp").display());
    println!("cargo:rerun-if-changed={}", src_file.display());
    println!("cargo:include={}", include_dir.display());
}
