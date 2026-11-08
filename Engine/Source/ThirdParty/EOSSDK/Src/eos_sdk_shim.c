/* SPDX-License-Identifier: MIT OR Apache-2.0 */
/**
 * YOLO Engine 6.0 (UE6) — Epic Online Services (EOS) Hermetic C SDK Implementation
 * Path: Engine/Source/ThirdParty/EOSSDK/Src/eos_sdk_shim.c
 *
 * Provides a hermetic C11 implementation of the Epic Online Services C ABI
 * (`EOS_Initialize`, `EOS_Platform_Create`, `EOS_Platform_Tick`, `EOS_Auth`,
 * `EOS_Connect`, `EOS_AntiCheatClient`) so C/C++/Rust/Bun targets link and
 * execute deterministically even before loading an external proprietary binary.
 */

#define EOS_BUILD_DLL 1
#include "../Include/eos_sdk.h"
#include <stdlib.h>
#include <string.h>

struct EOS_PlatformHandle {
    char product_id[64];
    char sandbox_id[64];
    char deployment_id[64];
    char client_id[64];
    EOS_Bool is_server;
    uint64_t tick_count;
};

static int g_eos_initialized = 0;

EOS_CALL EOS_EResult EOS_Initialize(const EOS_InitializeOptions* Options) {
    if (Options == NULL || Options->ProductName == NULL || Options->ProductVersion == NULL) {
        return EOS_InvalidParameters;
    }
    if (g_eos_initialized) {
        return EOS_AlreadyConfigured;
    }
    g_eos_initialized = 1;
    return EOS_Success;
}

EOS_CALL EOS_EResult EOS_Shutdown(void) {
    if (!g_eos_initialized) {
        return EOS_NotConfigured;
    }
    g_eos_initialized = 0;
    return EOS_Success;
}

EOS_CALL const char* EOS_EResult_ToString(EOS_EResult Result) {
    switch (Result) {
        case EOS_Success: return "EOS_Success";
        case EOS_NoConnection: return "EOS_NoConnection";
        case EOS_InvalidCredentials: return "EOS_InvalidCredentials";
        case EOS_InvalidUser: return "EOS_InvalidUser";
        case EOS_InvalidAuth: return "EOS_InvalidAuth";
        case EOS_AccessDenied: return "EOS_AccessDenied";
        case EOS_MissingPermissions: return "EOS_MissingPermissions";
        case EOS_Token_Not_Account: return "EOS_Token_Not_Account";
        case EOS_TooManyRequests: return "EOS_TooManyRequests";
        case EOS_Async_TimedOut: return "EOS_Async_TimedOut";
        case EOS_Canceled: return "EOS_Canceled";
        case EOS_IncompatibleVersion: return "EOS_IncompatibleVersion";
        case EOS_NotConfigured: return "EOS_NotConfigured";
        case EOS_AlreadyConfigured: return "EOS_AlreadyConfigured";
        case EOS_NotImplemented: return "EOS_NotImplemented";
        case EOS_UnexpectedError: return "EOS_UnexpectedError";
        case EOS_InvalidParameters: return "EOS_InvalidParameters";
        case EOS_NotFound: return "EOS_NotFound";
        default: return "EOS_Unknown";
    }
}

static void copy_bounded(char* dst, size_t dst_cap, const char* src) {
    if (dst == NULL || dst_cap == 0) return;
    if (src == NULL) {
        dst[0] = '\0';
        return;
    }
    size_t n = strlen(src);
    if (n >= dst_cap) {
        n = dst_cap - 1;
    }
    memcpy(dst, src, n);
    dst[n] = '\0';
}

EOS_CALL EOS_HPlatform EOS_Platform_Create(const EOS_Platform_Options* Options) {
    if (!g_eos_initialized || Options == NULL || Options->ProductId == NULL) {
        return NULL;
    }
    struct EOS_PlatformHandle* handle = (struct EOS_PlatformHandle*)calloc(1, sizeof(struct EOS_PlatformHandle));
    if (handle == NULL) {
        return NULL;
    }
    copy_bounded(handle->product_id, sizeof(handle->product_id), Options->ProductId);
    copy_bounded(handle->sandbox_id, sizeof(handle->sandbox_id), Options->SandboxId);
    copy_bounded(handle->deployment_id, sizeof(handle->deployment_id), Options->DeploymentId);
    copy_bounded(handle->client_id, sizeof(handle->client_id), Options->ClientCredentials.ClientId);
    handle->is_server = Options->bIsServer;
    handle->tick_count = 0;
    return handle;
}

EOS_CALL void EOS_Platform_Release(EOS_HPlatform Handle) {
    if (Handle != NULL) {
        free(Handle);
    }
}

EOS_CALL void EOS_Platform_Tick(EOS_HPlatform Handle) {
    if (Handle != NULL) {
        Handle->tick_count += 1;
    }
}

EOS_CALL EOS_HAuth EOS_Platform_GetAuthInterface(EOS_HPlatform Handle) {
    return (EOS_HAuth)Handle;
}

EOS_CALL EOS_HConnect EOS_Platform_GetConnectInterface(EOS_HPlatform Handle) {
    return (EOS_HConnect)Handle;
}

EOS_CALL EOS_HAntiCheatClient EOS_Platform_GetAntiCheatClientInterface(EOS_HPlatform Handle) {
    return (EOS_HAntiCheatClient)Handle;
}

EOS_CALL EOS_EResult EOS_Auth_VerifyIdToken_Sync(
    EOS_HAuth Handle,
    const char* EpicIdTokenJwt,
    char* OutAccountIdBuffer,
    int32_t* InOutBufferLength
) {
    if (Handle == NULL || EpicIdTokenJwt == NULL || OutAccountIdBuffer == NULL || InOutBufferLength == NULL) {
        return EOS_InvalidParameters;
    }
    if (strncmp(EpicIdTokenJwt, "eg1~", 4) != 0 && strncmp(EpicIdTokenJwt, "eyJ", 3) != 0) {
        return EOS_InvalidAuth;
    }
    const char* resolved_id = "epic_acct_sovereign_ue6_001";
    int32_t needed = (int32_t)strlen(resolved_id) + 1;
    if (*InOutBufferLength < needed) {
        *InOutBufferLength = needed;
        return EOS_InvalidParameters;
    }
    memcpy(OutAccountIdBuffer, resolved_id, (size_t)needed);
    *InOutBufferLength = needed;
    return EOS_Success;
}

EOS_CALL EOS_EResult EOS_AntiCheatClient_BeginSession(
    EOS_HAntiCheatClient Handle,
    const EOS_AntiCheatClient_BeginSessionOptions* Options
) {
    if (Handle == NULL || Options == NULL) {
        return EOS_InvalidParameters;
    }
    if (Options->Mode != EOS_ACCM_ClientServer && Options->Mode != EOS_ACCM_PeerToPeer) {
        return EOS_InvalidParameters;
    }
    return EOS_Success;
}

EOS_CALL EOS_EResult EOS_AntiCheatClient_EndSession(
    EOS_HAntiCheatClient Handle,
    const void* Options
) {
    (void)Options;
    if (Handle == NULL) {
        return EOS_InvalidParameters;
    }
    return EOS_Success;
}
