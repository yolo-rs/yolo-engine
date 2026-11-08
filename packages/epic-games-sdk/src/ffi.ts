// SPDX-License-Identifier: MIT OR Apache-2.0
/**
 * YOLO Engine 6.0 (UE6) — `@yolo-rs/epic-games-sdk/ffi`
 *
 * Dynamic `bun:ffi` C ABI bridge to Epic Online Services (`EOSSDK-Win64-Shipping.dll`,
 * `libEOSSDK-Linux-Shipping.so`, `libEOSSDK-Mac-Shipping.dylib`) and the hermetic
 * UE6 `Engine/Source/ThirdParty/EOSSDK/Include/eos_sdk.h` C/C++20/Rust SDK.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

export enum EOS_EResult {
  EOS_Success = 0,
  EOS_NoConnection = 1,
  EOS_InvalidCredentials = 2,
  EOS_InvalidUser = 3,
  EOS_InvalidAuth = 4,
  EOS_AccessDenied = 5,
  EOS_MissingPermissions = 6,
  EOS_Token_Not_Account = 7,
  EOS_TooManyRequests = 8,
  EOS_Async_TimedOut = 9,
  EOS_Canceled = 10,
  EOS_IncompatibleVersion = 11,
  EOS_NotConfigured = 12,
  EOS_AlreadyConfigured = 13,
  EOS_NotImplemented = 14,
  EOS_UnexpectedError = 15,
  EOS_InvalidParameters = 16,
  EOS_NotFound = 18,
}

export interface EosNativeLibraryDescriptor {
  readonly platform: NodeJS.Platform;
  readonly sharedLibraryName: string;
  readonly headerPath: string;
  readonly cppHeaderPath: string;
  readonly cShimSourcePath: string;
  readonly rustSysCratePath: string;
  readonly rustAuthCratePath: string;
  readonly resolvedBinaryPath: string | null;
}

/**
 * Resolves the platform-specific EOS C SDK library name (`EOSSDK-Win64-Shipping.dll`, `.so`, `.dylib`)
 * and locates the UE6 `Engine/Source/ThirdParty/EOSSDK` headers and crates.
 */
export function resolveEosNativeSdk(engineRoot: string): EosNativeLibraryDescriptor {
  const platform = process.platform;
  const sharedLibraryName =
    platform === "win32"
      ? "EOSSDK-Win64-Shipping.dll"
      : platform === "darwin"
        ? "libEOSSDK-Mac-Shipping.dylib"
        : "libEOSSDK-Linux-Shipping.so";

  const candidatePaths = [
    process.env.EOS_SDK_DLL_PATH,
    join(engineRoot, "Engine", "Binaries", "ThirdParty", "EOSSDK", sharedLibraryName),
    join(engineRoot, "Engine", "Source", "ThirdParty", "EOSSDK", "Bin", sharedLibraryName),
  ].filter((p): p is string => Boolean(p));

  let resolvedBinaryPath: string | null = null;
  for (const candidate of candidatePaths) {
    if (existsSync(candidate)) {
      resolvedBinaryPath = candidate;
      break;
    }
  }

  return {
    platform,
    sharedLibraryName,
    headerPath: join(engineRoot, "Engine", "Source", "ThirdParty", "EOSSDK", "Include", "eos_sdk.h"),
    cppHeaderPath: join(
      engineRoot,
      "Engine",
      "Source",
      "ThirdParty",
      "EOSSDK",
      "Include",
      "eos_sdk.hpp",
    ),
    cShimSourcePath: join(
      engineRoot,
      "Engine",
      "Source",
      "ThirdParty",
      "EOSSDK",
      "Src",
      "eos_sdk_shim.c",
    ),
    rustSysCratePath: join(
      engineRoot,
      "Engine",
      "Source",
      "ThirdParty",
      "EOSSDK",
      "epic-games-eos-sys",
    ),
    rustAuthCratePath: join(engineRoot, "Engine", "Source", "Runtime", "epic-games-auth"),
    resolvedBinaryPath,
  };
}
