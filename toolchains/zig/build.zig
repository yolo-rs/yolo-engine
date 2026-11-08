const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    // Compile the pinned upstream delta engine directly from its source tree.
    // Zstandard and libsais stay in their upstream languages (C); this avoids
    // a duplicate Rust implementation and makes the root target choice apply
    // consistently to the CLI and both delta tools.
    const zstd_translation = b.addTranslateC(.{
        .root_source_file = b.path("forks/zig-bsdiff/zstd/lib/zstd.h"),
        .target = target,
        .optimize = optimize,
    });
    const zstd_bindings = zstd_translation.createModule();

    const zstd_module = b.createModule(.{
        .target = target,
        .optimize = optimize,
        .link_libc = true,
    });
    zstd_module.addCMacro("ZSTD_DISABLE_ASM", "1");
    zstd_module.addIncludePath(b.path("forks/zig-bsdiff/zstd/lib"));
    zstd_module.addCSourceFiles(.{ .files = &.{
        "forks/zig-bsdiff/zstd/lib/common/debug.c",
        "forks/zig-bsdiff/zstd/lib/common/entropy_common.c",
        "forks/zig-bsdiff/zstd/lib/common/error_private.c",
        "forks/zig-bsdiff/zstd/lib/common/fse_decompress.c",
        "forks/zig-bsdiff/zstd/lib/common/pool.c",
        "forks/zig-bsdiff/zstd/lib/common/threading.c",
        "forks/zig-bsdiff/zstd/lib/common/xxhash.c",
        "forks/zig-bsdiff/zstd/lib/common/zstd_common.c",
        "forks/zig-bsdiff/zstd/lib/compress/fse_compress.c",
        "forks/zig-bsdiff/zstd/lib/compress/hist.c",
        "forks/zig-bsdiff/zstd/lib/compress/huf_compress.c",
        "forks/zig-bsdiff/zstd/lib/compress/zstd_compress_literals.c",
        "forks/zig-bsdiff/zstd/lib/compress/zstd_compress_sequences.c",
        "forks/zig-bsdiff/zstd/lib/compress/zstd_compress_superblock.c",
        "forks/zig-bsdiff/zstd/lib/compress/zstd_compress.c",
        "forks/zig-bsdiff/zstd/lib/compress/zstd_double_fast.c",
        "forks/zig-bsdiff/zstd/lib/compress/zstd_fast.c",
        "forks/zig-bsdiff/zstd/lib/compress/zstd_lazy.c",
        "forks/zig-bsdiff/zstd/lib/compress/zstd_ldm.c",
        "forks/zig-bsdiff/zstd/lib/compress/zstd_opt.c",
        "forks/zig-bsdiff/zstd/lib/compress/zstd_preSplit.c",
        "forks/zig-bsdiff/zstd/lib/compress/zstdmt_compress.c",
        "forks/zig-bsdiff/zstd/lib/decompress/zstd_decompress.c",
        "forks/zig-bsdiff/zstd/lib/decompress/zstd_ddict.c",
        "forks/zig-bsdiff/zstd/lib/decompress/zstd_decompress_block.c",
        "forks/zig-bsdiff/zstd/lib/decompress/huf_decompress.c",
    } });
    const zstd_library = b.addLibrary(.{
        .name = "yolo_zstd",
        .linkage = .static,
        .root_module = zstd_module,
    });

    const libsais_translation = b.addTranslateC(.{
        .root_source_file = b.path("forks/zig-bsdiff/src/libsais-wrapper/zig_wrapper.h"),
        .target = target,
        .optimize = optimize,
    });
    libsais_translation.addIncludePath(b.path("forks/libsais/include"));
    const libsais_bindings = libsais_translation.createModule();
    const libsais_module = b.createModule(.{
        .target = target,
        .optimize = optimize,
        .link_libc = true,
    });
    libsais_module.addIncludePath(b.path("forks/libsais/include"));
    libsais_module.addIncludePath(b.path("forks/zig-bsdiff/src/libsais-wrapper"));
    libsais_module.addCSourceFiles(.{ .files = &.{
        "forks/libsais/src/libsais.c",
        "forks/libsais/src/libsais64.c",
        "forks/zig-bsdiff/src/libsais-wrapper/zig_wrapper.c",
    } });
    const libsais_library = b.addLibrary(.{
        .name = "yolo_libsais",
        .linkage = .static,
        .root_module = libsais_module,
    });

    const bsdiff_module = b.createModule(.{
        .root_source_file = b.path("forks/zig-bsdiff/bsdiff.zig"),
        .target = target,
        .optimize = optimize,
    });
    bsdiff_module.addImport("zstd", zstd_bindings);
    bsdiff_module.addImport("libsais", libsais_bindings);
    bsdiff_module.linkLibrary(zstd_library);
    bsdiff_module.linkLibrary(libsais_library);
    const bsdiff = b.addExecutable(.{
        .name = "bsdiff",
        .root_module = bsdiff_module,
    });
    b.installArtifact(bsdiff);

    const bspatch_module = b.createModule(.{
        .root_source_file = b.path("forks/zig-bsdiff/bspatch.zig"),
        .target = target,
        .optimize = optimize,
    });
    bspatch_module.addImport("zstd", zstd_bindings);
    bspatch_module.linkLibrary(zstd_library);
    const bspatch = b.addExecutable(.{
        .name = "bspatch",
        .root_module = bspatch_module,
    });
    b.installArtifact(bspatch);

    const core = b.createModule(.{
        .root_source_file = b.path("libs/yolo-zig-abi/root.zig"),
        .target = target,
        .optimize = optimize,
    });

    const cli = b.addExecutable(.{
        .name = "yolo-zig",
        .root_module = b.createModule(.{
            .root_source_file = b.path("apps/yolo-zig/main.zig"),
            .target = target,
            .optimize = optimize,
            .imports = &.{.{ .name = "yolo_zig", .module = core }},
        }),
    });
    b.installArtifact(cli);

    const library = b.addLibrary(.{
        .name = "yolo_zig",
        .linkage = .dynamic,
        .root_module = core,
    });
    b.installArtifact(library);

    const install_header = b.addInstallFile(b.path("include/yolo_zig.h"), "include/yolo_zig.h");
    b.getInstallStep().dependOn(&install_header.step);

    const run_step = b.step("run", "Run the yolo-zig host diagnostic CLI");
    const run = b.addRunArtifact(cli);
    run.addPassthruArgs();
    run_step.dependOn(&run.step);
}
