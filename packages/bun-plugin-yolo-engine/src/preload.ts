// SPDX-License-Identifier: MIT OR Apache-2.0
/**
 * Runtime & Test Preload Entrypoint for `@yolo-rs/bun-plugin-yolo-engine`.
 * Automatically registered via `C:\src\yolo-engine\bunfig.toml`.
 */
import { plugin } from "bun";
import { yoloEngineBunPlugin } from "./index.ts";

plugin(yoloEngineBunPlugin);
