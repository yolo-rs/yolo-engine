/* SPDX-License-Identifier: MIT OR Apache-2.0 */
/**
 * YOLO Engine 6.0 (UE6) — Epic Online Services (EOS) Official C ABI SDK Headers
 * Path: Engine/Source/ThirdParty/EOSSDK/Include/eos_sdk.h
 *
 * Mirrors the official Epic Games EOS C SDK ABI (`EOSSDK-Win64-Shipping.dll`,
 * `libEOSSDK-Linux-Shipping.so`, `libEOSSDK-Mac-Shipping.dylib`) for zero-copy
 * FFI bindings across C, C++20, Rust (`epic-games-eos-sys`), and Bun (`bun:ffi`).
 */

#ifndef YOLO_EOS_SDK_H
#define YOLO_EOS_SDK_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#if defined(_WIN32)
  #if defined(EOS_BUILD_DLL)
    #define EOS_CALL __declspec(dllexport)
  #else
    #define EOS_CALL __declspec(dllimport)
  #endif
#else
  #define EOS_CALL __attribute__((visibility("default")))
#endif

typedef int32_t EOS_Bool;
#define EOS_TRUE 1
#define EOS_FALSE 0

#define EOS_INITIALIZE_API_LATEST 4
#define EOS_PLATFORM_OPTIONS_API_LATEST 14
#define EOS_AUTH_CREDENTIALS_API_LATEST 4
#define EOS_AUTH_LOGIN_API_LATEST 3
#define EOS_CONNECT_CREDENTIALS_API_LATEST 1
#define EOS_CONNECT_LOGIN_API_LATEST 2
#define EOS_ANTICHEATCLIENT_BEGINSESSION_API_LATEST 3

/**
 * EOS_EResult status codes matching Epic Online Services C SDK.
 */
typedef enum EOS_EResult {
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
    EOS_NotFound = 18
} EOS_EResult;

/**
 * EOS_ELoginCredentialType for Epic Account Services (`EOS_Auth`).
 */
typedef enum EOS_ELoginCredentialType {
    EOS_LCT_Password = 0,
    EOS_LCT_ExchangeCode = 1,
    EOS_LCT_PersistentAuth = 2,
    EOS_LCT_DeviceCode = 3,
    EOS_LCT_Developer = 4,
    EOS_LCT_RefreshToken = 5,
    EOS_LCT_AccountPortal = 6,
    EOS_LCT_ExternalAuth = 7
} EOS_ELoginCredentialType;

/**
 * EOS_EExternalCredentialType for Game Services (`EOS_Connect`).
 */
typedef enum EOS_EExternalCredentialType {
    EOS_ECT_EPIC = 0,
    EOS_ECT_STEAM_APP_TICKET = 1,
    EOS_ECT_PSN_ID_TOKEN = 2,
    EOS_ECT_XBL_XSTS_TOKEN = 3,
    EOS_ECT_DISCORD_ACCESS_TOKEN = 4,
    EOS_ECT_GOG_SESSION_TICKET = 5,
    EOS_ECT_NINTENDO_ID_TOKEN = 6,
    EOS_ECT_APPLE_ID_TOKEN = 9,
    EOS_ECT_GOOGLE_ID_TOKEN = 10,
    EOS_ECT_OPENID_ACCESS_TOKEN = 11,
    EOS_ECT_DEVICEID_ACCESS_TOKEN = 14,
    EOS_ECT_EPIC_ID_TOKEN = 18
} EOS_EExternalCredentialType;

/**
 * EOS_EAuthScopeFlags bitwise flags for Epic Account Services OAuth2 / Auth.
 */
typedef enum EOS_EAuthScopeFlags {
    EOS_AS_NoFlags = 0x0,
    EOS_AS_BasicProfile = 0x1,
    EOS_AS_FriendsList = 0x2,
    EOS_AS_Presence = 0x4,
    EOS_AS_FriendsManagement = 0x8,
    EOS_AS_Email = 0x10,
    EOS_AS_Country = 0x20
} EOS_EAuthScopeFlags;

/**
 * EOS_EAntiCheatClientMode for Easy Anti-Cheat (EAC) sessions.
 */
typedef enum EOS_EAntiCheatClientMode {
    EOS_ACCM_Invalid = 0,
    EOS_ACCM_ClientServer = 1,
    EOS_ACCM_PeerToPeer = 2
} EOS_EAntiCheatClientMode;

/* Opaque handles */
typedef struct EOS_PlatformHandle* EOS_HPlatform;
typedef struct EOS_AuthHandle* EOS_HAuth;
typedef struct EOS_ConnectHandle* EOS_HConnect;
typedef struct EOS_AntiCheatClientHandle* EOS_HAntiCheatClient;
typedef struct EOS_SessionsHandle* EOS_HSessions;
typedef struct EOS_LobbiesHandle* EOS_HLobbies;
typedef struct EOS_P2PHandle* EOS_HP2P;
typedef struct EOS_EpicAccountIdDetails* EOS_EpicAccountId;
typedef struct EOS_ProductUserIdDetails* EOS_ProductUserId;

typedef struct EOS_InitializeOptions {
    int32_t ApiVersion;
    void* AllocateMemoryFunction;
    void* ReallocateMemoryFunction;
    void* ReleaseMemoryFunction;
    const char* ProductName;
    const char* ProductVersion;
    void* Reserved;
    void* SystemInitializeOptions;
    void* OverrideThreadAffinity;
} EOS_InitializeOptions;

typedef struct EOS_Platform_ClientCredentials {
    const char* ClientId;
    const char* ClientSecret;
} EOS_Platform_ClientCredentials;

typedef struct EOS_Platform_Options {
    int32_t ApiVersion;
    void* Reserved;
    const char* ProductId;
    const char* SandboxId;
    EOS_Platform_ClientCredentials ClientCredentials;
    EOS_Bool bIsServer;
    const char* EncryptionKey;
    const char* OverrideCountryCode;
    const char* OverrideLocaleCode;
    const char* DeploymentId;
    uint64_t Flags;
    const char* CacheDirectory;
    uint32_t TickBudgetInMilliseconds;
    const void* RTCOptions;
    void* IntegratedPlatformOptionsContainerHandle;
} EOS_Platform_Options;

typedef struct EOS_Auth_Credentials {
    int32_t ApiVersion;
    const char* Id;
    const char* Token;
    EOS_ELoginCredentialType Type;
    void* SystemAuthCredentialsOptions;
    EOS_EExternalCredentialType ExternalType;
} EOS_Auth_Credentials;

typedef struct EOS_Auth_LoginOptions {
    int32_t ApiVersion;
    const EOS_Auth_Credentials* Credentials;
    EOS_EAuthScopeFlags ScopeFlags;
    uint64_t LoginFlags;
} EOS_Auth_LoginOptions;

typedef struct EOS_Auth_Token {
    int32_t ApiVersion;
    const char* App;
    const char* ClientId;
    EOS_EpicAccountId AccountId;
    const char* AccessToken;
    double ExpiresIn;
    const char* ExpiresAt;
    int32_t AuthType;
    const char* RefreshToken;
    double RefreshExpiresIn;
    const char* RefreshExpiresAt;
} EOS_Auth_Token;

typedef struct EOS_Connect_Credentials {
    int32_t ApiVersion;
    const char* Token;
    EOS_EExternalCredentialType Type;
} EOS_Connect_Credentials;

typedef struct EOS_Connect_LoginOptions {
    int32_t ApiVersion;
    const EOS_Connect_Credentials* Credentials;
    const void* UserLoginInfo;
} EOS_Connect_LoginOptions;

typedef struct EOS_AntiCheatClient_BeginSessionOptions {
    int32_t ApiVersion;
    EOS_ProductUserId LocalUserId;
    EOS_EAntiCheatClientMode Mode;
} EOS_AntiCheatClient_BeginSessionOptions;

/* Core SDK Lifecycle */
EOS_CALL EOS_EResult EOS_Initialize(const EOS_InitializeOptions* Options);
EOS_CALL EOS_EResult EOS_Shutdown(void);
EOS_CALL const char* EOS_EResult_ToString(EOS_EResult Result);

/* Platform Interface */
EOS_CALL EOS_HPlatform EOS_Platform_Create(const EOS_Platform_Options* Options);
EOS_CALL void EOS_Platform_Release(EOS_HPlatform Handle);
EOS_CALL void EOS_Platform_Tick(EOS_HPlatform Handle);
EOS_CALL EOS_HAuth EOS_Platform_GetAuthInterface(EOS_HPlatform Handle);
EOS_CALL EOS_HConnect EOS_Platform_GetConnectInterface(EOS_HPlatform Handle);
EOS_CALL EOS_HAntiCheatClient EOS_Platform_GetAntiCheatClientInterface(EOS_HPlatform Handle);

/* Auth & Connect Synchronous / FFI Shim Helpers for UE6 */
EOS_CALL EOS_EResult EOS_Auth_VerifyIdToken_Sync(
    EOS_HAuth Handle,
    const char* EpicIdTokenJwt,
    char* OutAccountIdBuffer,
    int32_t* InOutBufferLength
);

EOS_CALL EOS_EResult EOS_AntiCheatClient_BeginSession(
    EOS_HAntiCheatClient Handle,
    const EOS_AntiCheatClient_BeginSessionOptions* Options
);

EOS_CALL EOS_EResult EOS_AntiCheatClient_EndSession(
    EOS_HAntiCheatClient Handle,
    const void* Options
);

#ifdef __cplusplus
}
#endif

#endif /* YOLO_EOS_SDK_H */
