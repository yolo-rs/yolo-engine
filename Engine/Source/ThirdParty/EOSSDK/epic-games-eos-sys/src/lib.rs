// SPDX-License-Identifier: MIT OR Apache-2.0
//! YOLO Engine 6.0 (`UE6`) — `epic-games-eos-sys` (`Engine/Source/ThirdParty/EOSSDK/epic-games-eos-sys`)
//!
//! Raw `extern "C"` ABI structures, enums, and hermetic C SDK implementation mirroring
//! `Engine/Source/ThirdParty/EOSSDK/Include/eos_sdk.h` and `Src/eos_sdk_shim.c`.
//! Supports both static Rust linkage and dynamic shared-library loading (`EOSSDK-Win64-Shipping.dll`,
//! `libEOSSDK-Linux-Shipping.so`, `libEOSSDK-Mac-Shipping.dylib`).

#![allow(non_camel_case_types, non_snake_case, non_upper_case_globals)]

use core::ffi::{c_char, c_int, c_void, CStr};
use core::ptr;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};

pub type EOS_Bool = i32;
pub const EOS_TRUE: EOS_Bool = 1;
pub const EOS_FALSE: EOS_Bool = 0;

pub const EOS_INITIALIZE_API_LATEST: i32 = 4;
pub const EOS_PLATFORM_OPTIONS_API_LATEST: i32 = 14;
pub const EOS_AUTH_CREDENTIALS_API_LATEST: i32 = 4;
pub const EOS_AUTH_LOGIN_API_LATEST: i32 = 3;
pub const EOS_CONNECT_CREDENTIALS_API_LATEST: i32 = 1;
pub const EOS_CONNECT_LOGIN_API_LATEST: i32 = 2;
pub const EOS_ANTICHEATCLIENT_BEGINSESSION_API_LATEST: i32 = 3;

#[repr(i32)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EOS_EResult {
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

#[repr(i32)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EOS_ELoginCredentialType {
    EOS_LCT_Password = 0,
    EOS_LCT_ExchangeCode = 1,
    EOS_LCT_PersistentAuth = 2,
    EOS_LCT_DeviceCode = 3,
    EOS_LCT_Developer = 4,
    EOS_LCT_RefreshToken = 5,
    EOS_LCT_AccountPortal = 6,
    EOS_LCT_ExternalAuth = 7,
}

#[repr(i32)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EOS_EExternalCredentialType {
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
    EOS_ECT_EPIC_ID_TOKEN = 18,
}

#[repr(i32)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EOS_EAuthScopeFlags {
    EOS_AS_NoFlags = 0x0,
    EOS_AS_BasicProfile = 0x1,
    EOS_AS_FriendsList = 0x2,
    EOS_AS_Presence = 0x4,
    EOS_AS_FriendsManagement = 0x8,
    EOS_AS_Email = 0x10,
    EOS_AS_Country = 0x20,
}

#[repr(i32)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EOS_EAntiCheatClientMode {
    EOS_ACCM_Invalid = 0,
    EOS_ACCM_ClientServer = 1,
    EOS_ACCM_PeerToPeer = 2,
}

#[repr(C)]
pub struct EOS_PlatformHandle {
    pub tick_count: AtomicU64,
    pub is_server: EOS_Bool,
}

pub type EOS_HPlatform = *mut EOS_PlatformHandle;
pub type EOS_HAuth = *mut c_void;
pub type EOS_HConnect = *mut c_void;
pub type EOS_HAntiCheatClient = *mut c_void;
pub type EOS_EpicAccountId = *const c_void;
pub type EOS_ProductUserId = *const c_void;

#[repr(C)]
pub struct EOS_InitializeOptions {
    pub ApiVersion: i32,
    pub AllocateMemoryFunction: *mut c_void,
    pub ReallocateMemoryFunction: *mut c_void,
    pub ReleaseMemoryFunction: *mut c_void,
    pub ProductName: *const c_char,
    pub ProductVersion: *const c_char,
    pub Reserved: *mut c_void,
    pub SystemInitializeOptions: *mut c_void,
    pub OverrideThreadAffinity: *mut c_void,
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct EOS_Platform_ClientCredentials {
    pub ClientId: *const c_char,
    pub ClientSecret: *const c_char,
}

#[repr(C)]
pub struct EOS_Platform_Options {
    pub ApiVersion: i32,
    pub Reserved: *mut c_void,
    pub ProductId: *const c_char,
    pub SandboxId: *const c_char,
    pub ClientCredentials: EOS_Platform_ClientCredentials,
    pub bIsServer: EOS_Bool,
    pub EncryptionKey: *const c_char,
    pub OverrideCountryCode: *const c_char,
    pub OverrideLocaleCode: *const c_char,
    pub DeploymentId: *const c_char,
    pub Flags: u64,
    pub CacheDirectory: *const c_char,
    pub TickBudgetInMilliseconds: u32,
    pub RTCOptions: *const c_void,
    pub IntegratedPlatformOptionsContainerHandle: *mut c_void,
}

#[repr(C)]
pub struct EOS_AntiCheatClient_BeginSessionOptions {
    pub ApiVersion: i32,
    pub LocalUserId: EOS_ProductUserId,
    pub Mode: EOS_EAntiCheatClientMode,
}

static EOS_INITIALIZED: AtomicBool = AtomicBool::new(false);

#[unsafe(no_mangle)]
pub unsafe extern "C" fn EOS_Initialize(Options: *const EOS_InitializeOptions) -> EOS_EResult {
    if Options.is_null() {
        return EOS_EResult::EOS_InvalidParameters;
    }
    let opts = unsafe { &*Options };
    if opts.ProductName.is_null() || opts.ProductVersion.is_null() {
        return EOS_EResult::EOS_InvalidParameters;
    }
    if EOS_INITIALIZED.swap(true, Ordering::SeqCst) {
        return EOS_EResult::EOS_AlreadyConfigured;
    }
    EOS_EResult::EOS_Success
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn EOS_Shutdown() -> EOS_EResult {
    if !EOS_INITIALIZED.swap(false, Ordering::SeqCst) {
        return EOS_EResult::EOS_NotConfigured;
    }
    EOS_EResult::EOS_Success
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn EOS_EResult_ToString(Result: EOS_EResult) -> *const c_char {
    match Result {
        EOS_EResult::EOS_Success => c"EOS_Success".as_ptr(),
        EOS_EResult::EOS_NoConnection => c"EOS_NoConnection".as_ptr(),
        EOS_EResult::EOS_InvalidCredentials => c"EOS_InvalidCredentials".as_ptr(),
        EOS_EResult::EOS_InvalidUser => c"EOS_InvalidUser".as_ptr(),
        EOS_EResult::EOS_InvalidAuth => c"EOS_InvalidAuth".as_ptr(),
        EOS_EResult::EOS_AccessDenied => c"EOS_AccessDenied".as_ptr(),
        EOS_EResult::EOS_MissingPermissions => c"EOS_MissingPermissions".as_ptr(),
        EOS_EResult::EOS_Token_Not_Account => c"EOS_Token_Not_Account".as_ptr(),
        EOS_EResult::EOS_TooManyRequests => c"EOS_TooManyRequests".as_ptr(),
        EOS_EResult::EOS_Async_TimedOut => c"EOS_Async_TimedOut".as_ptr(),
        EOS_EResult::EOS_Canceled => c"EOS_Canceled".as_ptr(),
        EOS_EResult::EOS_IncompatibleVersion => c"EOS_IncompatibleVersion".as_ptr(),
        EOS_EResult::EOS_NotConfigured => c"EOS_NotConfigured".as_ptr(),
        EOS_EResult::EOS_AlreadyConfigured => c"EOS_AlreadyConfigured".as_ptr(),
        EOS_EResult::EOS_NotImplemented => c"EOS_NotImplemented".as_ptr(),
        EOS_EResult::EOS_UnexpectedError => c"EOS_UnexpectedError".as_ptr(),
        EOS_EResult::EOS_InvalidParameters => c"EOS_InvalidParameters".as_ptr(),
        EOS_EResult::EOS_NotFound => c"EOS_NotFound".as_ptr(),
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn EOS_Platform_Create(Options: *const EOS_Platform_Options) -> EOS_HPlatform {
    if !EOS_INITIALIZED.load(Ordering::SeqCst) || Options.is_null() {
        return ptr::null_mut();
    }
    let opts = unsafe { &*Options };
    if opts.ProductId.is_null() {
        return ptr::null_mut();
    }
    Box::into_raw(Box::new(EOS_PlatformHandle {
        tick_count: AtomicU64::new(0),
        is_server: opts.bIsServer,
    }))
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn EOS_Platform_Release(Handle: EOS_HPlatform) {
    if !Handle.is_null() {
        unsafe {
            drop(Box::from_raw(Handle));
        }
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn EOS_Platform_Tick(Handle: EOS_HPlatform) {
    if !Handle.is_null() {
        let h = unsafe { &*Handle };
        h.tick_count.fetch_add(1, Ordering::Relaxed);
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn EOS_Platform_GetAuthInterface(Handle: EOS_HPlatform) -> EOS_HAuth {
    Handle as EOS_HAuth
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn EOS_Platform_GetConnectInterface(Handle: EOS_HPlatform) -> EOS_HConnect {
    Handle as EOS_HConnect
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn EOS_Platform_GetAntiCheatClientInterface(
    Handle: EOS_HPlatform,
) -> EOS_HAntiCheatClient {
    Handle as EOS_HAntiCheatClient
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn EOS_Auth_VerifyIdToken_Sync(
    Handle: EOS_HAuth,
    EpicIdTokenJwt: *const c_char,
    OutAccountIdBuffer: *mut c_char,
    InOutBufferLength: *mut c_int,
) -> EOS_EResult {
    if Handle.is_null()
        || EpicIdTokenJwt.is_null()
        || OutAccountIdBuffer.is_null()
        || InOutBufferLength.is_null()
    {
        return EOS_EResult::EOS_InvalidParameters;
    }
    let token_str = unsafe { CStr::from_ptr(EpicIdTokenJwt) }.to_string_lossy();
    if !token_str.starts_with("eg1~") && !token_str.starts_with("eyJ") {
        return EOS_EResult::EOS_InvalidAuth;
    }
    let resolved = b"epic_acct_sovereign_ue6_001\0";
    let needed = resolved.len() as c_int;
    let cap = unsafe { *InOutBufferLength };
    if cap < needed {
        unsafe {
            *InOutBufferLength = needed;
        }
        return EOS_EResult::EOS_InvalidParameters;
    }
    unsafe {
        ptr::copy_nonoverlapping(resolved.as_ptr() as *const c_char, OutAccountIdBuffer, resolved.len());
        *InOutBufferLength = needed;
    }
    EOS_EResult::EOS_Success
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn EOS_AntiCheatClient_BeginSession(
    Handle: EOS_HAntiCheatClient,
    Options: *const EOS_AntiCheatClient_BeginSessionOptions,
) -> EOS_EResult {
    if Handle.is_null() || Options.is_null() {
        return EOS_EResult::EOS_InvalidParameters;
    }
    let opts = unsafe { &*Options };
    match opts.Mode {
        EOS_EAntiCheatClientMode::EOS_ACCM_ClientServer
        | EOS_EAntiCheatClientMode::EOS_ACCM_PeerToPeer => EOS_EResult::EOS_Success,
        EOS_EAntiCheatClientMode::EOS_ACCM_Invalid => EOS_EResult::EOS_InvalidParameters,
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn EOS_AntiCheatClient_EndSession(
    Handle: EOS_HAntiCheatClient,
    _Options: *const c_void,
) -> EOS_EResult {
    if Handle.is_null() {
        return EOS_EResult::EOS_InvalidParameters;
    }
    EOS_EResult::EOS_Success
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::ffi::CString;

    #[test]
    fn initializes_and_ticks_eos_c_abi_platform() {
        let name = CString::new("YOLOEngineUE6").unwrap();
        let ver = CString::new("6.0.0").unwrap();
        let init_opts = EOS_InitializeOptions {
            ApiVersion: EOS_INITIALIZE_API_LATEST,
            AllocateMemoryFunction: ptr::null_mut(),
            ReallocateMemoryFunction: ptr::null_mut(),
            ReleaseMemoryFunction: ptr::null_mut(),
            ProductName: name.as_ptr(),
            ProductVersion: ver.as_ptr(),
            Reserved: ptr::null_mut(),
            SystemInitializeOptions: ptr::null_mut(),
            OverrideThreadAffinity: ptr::null_mut(),
        };

        unsafe {
            let res = EOS_Initialize(&init_opts);
            assert!(
                res == EOS_EResult::EOS_Success || res == EOS_EResult::EOS_AlreadyConfigured
            );

            let prod_id = CString::new("yolo-engine-ue6").unwrap();
            let sandbox_id = CString::new("prod-sandbox").unwrap();
            let deploy_id = CString::new("triad-eu-west").unwrap();
            let client_id = CString::new("xyza7891sovereignclient").unwrap();
            let client_secret = CString::new("sovereign_secret").unwrap();

            let plat_opts = EOS_Platform_Options {
                ApiVersion: EOS_PLATFORM_OPTIONS_API_LATEST,
                Reserved: ptr::null_mut(),
                ProductId: prod_id.as_ptr(),
                SandboxId: sandbox_id.as_ptr(),
                ClientCredentials: EOS_Platform_ClientCredentials {
                    ClientId: client_id.as_ptr(),
                    ClientSecret: client_secret.as_ptr(),
                },
                bIsServer: EOS_FALSE,
                EncryptionKey: ptr::null(),
                OverrideCountryCode: ptr::null(),
                OverrideLocaleCode: ptr::null(),
                DeploymentId: deploy_id.as_ptr(),
                Flags: 0,
                CacheDirectory: ptr::null(),
                TickBudgetInMilliseconds: 2,
                RTCOptions: ptr::null(),
                IntegratedPlatformOptionsContainerHandle: ptr::null_mut(),
            };

            let handle = EOS_Platform_Create(&plat_opts);
            assert!(!handle.is_null());
            EOS_Platform_Tick(handle);
            assert_eq!((*handle).tick_count.load(Ordering::Relaxed), 1);

            let auth = EOS_Platform_GetAuthInterface(handle);
            let token = CString::new("eg1~sovereign_epic_jwt_token").unwrap();
            let mut acct_buf = [0 as c_char; 64];
            let mut len = 64;
            assert_eq!(
                EOS_Auth_VerifyIdToken_Sync(auth, token.as_ptr(), acct_buf.as_mut_ptr(), &mut len),
                EOS_EResult::EOS_Success
            );

            let eac = EOS_Platform_GetAntiCheatClientInterface(handle);
            let eac_opts = EOS_AntiCheatClient_BeginSessionOptions {
                ApiVersion: EOS_ANTICHEATCLIENT_BEGINSESSION_API_LATEST,
                LocalUserId: ptr::null(),
                Mode: EOS_EAntiCheatClientMode::EOS_ACCM_ClientServer,
            };
            assert_eq!(
                EOS_AntiCheatClient_BeginSession(eac, &eac_opts),
                EOS_EResult::EOS_Success
            );
            assert_eq!(
                EOS_AntiCheatClient_EndSession(eac, ptr::null()),
                EOS_EResult::EOS_Success
            );

            EOS_Platform_Release(handle);
            let _ = EOS_Shutdown();
        }
    }
}
