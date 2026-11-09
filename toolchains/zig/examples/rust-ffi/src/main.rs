fn main() {
    match yolo_zig_ffi::runtime_info() {
        Ok(info) => println!(
            "{{\"abi\":{},\"os\":\"{}\",\"arch\":\"{}\"}}",
            info.abi_version, info.target_os, info.target_arch
        ),
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(1);
        }
    }
}
