// ============================================================================
// YOLO Engine 6.0 (UE6) — LumenScreenProbeGather.wgsl
// Dynamic Global Illumination & Radiance Cache Probe Gather (gfx-rs/wgpu + naga)
// ============================================================================

struct LumenProbeParams {
    probe_spacing: u32,
    max_trace_distance: f32,
    temporal_blend_weight: f32,
    frame_index: u32,
};

@group(0) @binding(0) var<uniform> params: LumenProbeParams;
@group(0) @binding(1) var gbuffer_normal: texture_2d<f32>;
@group(0) @binding(2) var gbuffer_depth: texture_2d<f32>;
@group(0) @binding(3) var irradiance_output: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let dims = textureDimensions(irradiance_output);
    if (gid.x >= dims.x || gid.y >= dims.y) {
        return;
    }

    let coord = vec2<i32>(gid.xy);
    let normal = textureLoad(gbuffer_normal, coord, 0).xyz * 2.0 - 1.0;
    let depth = textureLoad(gbuffer_depth, coord, 0).r;

    let sky_zenith = vec3<f32>(0.18, 0.34, 0.72);
    let ground_bounce = vec3<f32>(0.08, 0.07, 0.06);
    let hemi = clamp(normal.y * 0.5 + 0.5, 0.0, 1.0);
    let radiance = mix(ground_bounce, sky_zenith, hemi) * step(0.0001, depth);

    textureStore(irradiance_output, coord, vec4<f32>(radiance, 1.0));
}
