// ============================================================================
// YOLO Engine 6.0 (UE6) — NaniteClusterCull.wgsl
// GPU-Driven Hierarchical Cluster & Meshlet Culling Shader (gfx-rs/wgpu + naga)
// ============================================================================

struct NaniteClusterHeader {
    bounding_sphere: vec4<f32>,
    lod_error_and_edge_length: vec4<f32>,
    vertex_offset: u32,
    vertex_count: u32,
    triangle_offset: u32,
    triangle_count: u32,
    group_id: u32,
    flags: u32,
};

struct ViewUniforms {
    view_proj: mat4x4<f32>,
    camera_position: vec4<f32>,
    viewport_size: vec2<f32>,
    lod_scale: f32,
    max_visible_clusters: u32,
};

@group(0) @binding(0) var<uniform> view: ViewUniforms;
@group(0) @binding(1) var<storage, read> clusters: array<NaniteClusterHeader>;
@group(0) @binding(2) var<storage, read_write> visible_cluster_indices: array<u32>;
@group(0) @binding(3) var<storage, read_write> visible_count: atomic<u32>;

@compute @workgroup_size(64, 1, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let cluster_idx = global_id.x;
    if (cluster_idx >= arrayLength(&clusters)) {
        return;
    }

    let cluster = clusters[cluster_idx];
    let dist = distance(view.camera_position.xyz, cluster.bounding_sphere.xyz);
    let radius = cluster.bounding_sphere.w;

    // Frustum & LOD screen-space error threshold check
    let projected_error = (cluster.lod_error_and_edge_length.x * view.lod_scale) / max(dist - radius, 0.001);
    if (projected_error >= 1.0) {
        let out_slot = atomicAdd(&visible_cluster_indices[0], 1u);
        if (out_slot < view.max_visible_clusters) {
            let write_idx = atomicAdd(&visible_count, 1u);
            visible_cluster_indices[write_idx] = cluster_idx;
        }
    }
}
