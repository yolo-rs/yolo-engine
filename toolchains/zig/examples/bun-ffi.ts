import { dlopen, suffix } from "bun:ffi";

const libraryUrl = new URL(
  suffix === "dll"
    ? "../zig-out/bin/yolo_zig.dll"
    : `../zig-out/lib/libyolo_zig.${suffix}`,
  import.meta.url,
);

const library = dlopen(libraryUrl, {
  yolo_zig_abi_version: { args: [], returns: "u32" },
  yolo_zig_target_os: { args: [], returns: "cstring" },
  yolo_zig_target_arch: { args: [], returns: "cstring" },
});

try {
  console.log(
    JSON.stringify({
      abi: library.symbols.yolo_zig_abi_version(),
      os: library.symbols.yolo_zig_target_os(),
      arch: library.symbols.yolo_zig_target_arch(),
    }),
  );
} finally {
  library.close();
}
