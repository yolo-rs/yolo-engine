// SPDX-License-Identifier: MIT OR Apache-2.0
use yolo_engine_editor::FUnrealEdWorkspaceState;

fn main() {
    let state = FUnrealEdWorkspaceState::bootstrap_default_editor();
    println!(
        "{}",
        serde_json::to_string_pretty(&state).expect("serialize UnrealEd 6.0 state")
    );
}
