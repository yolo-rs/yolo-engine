use std::env;

fn main() {
    let library_dir = env::var("YOLO_ZIG_LIB_DIR")
        .expect("set YOLO_ZIG_LIB_DIR to the directory containing yolo_zig shared library");

    println!("cargo:rustc-link-search=native={library_dir}");
    println!("cargo:rustc-link-lib=dylib=yolo_zig");
    println!("cargo:rerun-if-env-changed=YOLO_ZIG_LIB_DIR");
}
