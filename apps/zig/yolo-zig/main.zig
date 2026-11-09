const std = @import("std");
const yolo_zig = @import("yolo_zig");

pub fn main(init: std.process.Init) !void {
    const allocator = init.arena.allocator();
    const args = try init.minimal.args.toSlice(allocator);
    const command = if (args.len > 1) args[1] else "help";
    const json = args.len > 2 and std.mem.eql(u8, args[2], "--json");

    var buffer: [256]u8 = undefined;
    var file_writer: std.Io.File.Writer = .init(.stdout(), init.io, &buffer);
    const out = &file_writer.interface;

    if (std.mem.eql(u8, command, "help") or std.mem.eql(u8, command, "--help") or std.mem.eql(u8, command, "-h")) {
        try out.writeAll(
            "yolo-zig - native Zig support tools for the YOLO stack\n\n" ++
                "Usage: yolo-zig <command> [--json]\n\n" ++
                "Commands:\n" ++
                "  host       Show the compile target for this binary\n" ++
                "  abi        Show the C ABI version\n" ++
                "  help       Show this help\n",
        );
    } else if (std.mem.eql(u8, command, "host")) {
        if (json) {
            try out.print(
                "{{\"os\":\"{s}\",\"arch\":\"{s}\",\"abi\":{d}}}\n",
                .{ yolo_zig.targetOs(), yolo_zig.targetArch(), yolo_zig.abi_version },
            );
        } else {
            try out.print("os={s} arch={s} abi={d}\n", .{
                yolo_zig.targetOs(),
                yolo_zig.targetArch(),
                yolo_zig.abi_version,
            });
        }
    } else if (std.mem.eql(u8, command, "abi")) {
        try out.print("{d}\n", .{yolo_zig.abi_version});
    } else {
        std.debug.print("unknown yolo-zig command: {s}\n", .{command});
        return error.InvalidCommand;
    }

    try out.flush();
}
