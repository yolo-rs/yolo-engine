use std::{env, path::PathBuf};

fn main() {
    println!("cargo:rerun-if-env-changed=YOLO_ZIG_LIB_DIR");
    if env::var_os("CARGO_FEATURE_LINK_YOLO_ZIG").is_none() {
        return;
    }

    let library_dir = env::var_os("YOLO_ZIG_LIB_DIR")
        .map(PathBuf::from)
        .expect("feature `link-yolo-zig` requires YOLO_ZIG_LIB_DIR to point to yolo_zig shared library");
    println!("cargo:rustc-link-search=native={}", library_dir.display());
    println!("cargo:rustc-link-lib=dylib=yolo_zig");
}
