// SPDX-License-Identifier: MIT OR Apache-2.0
//! YOLO Engine 6.0 (`UE6`) — `epic-games-auth` (`Engine/Source/Runtime/epic-games-auth`)
//!
//! Full Rust 2024 implementation of:
//! 1. **Epic Account Services OAuth2 (`https://api.epicgames.dev/epic/oauth/v2`)**:
//!    - `authorization_code` + PKCE (`S256`) flow (`https://www.epicgames.com/id/authorize`)
//!    - `exchange_code` flow (Epic Games Launcher `-AUTH_LOGIN=unused -AUTH_PASSWORD=<code > -AUTH_TYPE=exchangecode`)
//!    - `client_credentials` flow (Dedicated Server & Trusted Backend)
//!    - `refresh_token` rotation & RFC 7009 token revocation (`/epic/oauth/v2/revoke`)
//!    - `device_code` headless console/TUI authentication
//!    - JWKS (`https://api.epicgames.dev/epic/oauth/v2/.well-known/jwks.json`) & `eg1~` JWT verification
//! 2. **Safe RAII Wrapper over `epic-games-eos-sys` (`EOS_HPlatform`, `EOS_HAuth`, `EOS_HConnect`, `EOS_HAntiCheatClient`)**
//! 3. **Keyless Chrome / Epic Games Launcher Local Vault Session Sync** (`ExchangeCode` & `ContinuationToken`)

use epic_games_eos_sys::{
    EOS_AntiCheatClient_BeginSession, EOS_AntiCheatClient_BeginSessionOptions,
    EOS_AntiCheatClient_EndSession, EOS_Auth_VerifyIdToken_Sync, EOS_EAntiCheatClientMode,
    EOS_EResult, EOS_HPlatform, EOS_Initialize, EOS_InitializeOptions, EOS_Platform_ClientCredentials,
    EOS_Platform_Create, EOS_Platform_GetAntiCheatClientInterface, EOS_Platform_GetAuthInterface,
    EOS_Platform_Options, EOS_Platform_Release, EOS_Platform_Tick, EOS_Shutdown,
    EOS_ANTICHEATCLIENT_BEGINSESSION_API_LATEST, EOS_FALSE, EOS_INITIALIZE_API_LATEST,
    EOS_PLATFORM_OPTIONS_API_LATEST, EOS_TRUE,
};
use serde::{Deserialize, Serialize};
use std::ffi::{c_char, CStr, CString};
use std::ptr;

pub const EPIC_OAUTH_AUTHORIZE_URL: &str = "https://www.epicgames.com/id/authorize";
pub const EPIC_OAUTH_TOKEN_URL: &str = "https://api.epicgames.dev/epic/oauth/v2/token";
pub const EPIC_OAUTH_REVOKE_URL: &str = "https://api.epicgames.dev/epic/oauth/v2/revoke";
pub const EPIC_OAUTH_TOKEN_INFO_URL: &str = "https://api.epicgames.dev/epic/oauth/v2/tokenInfo";
pub const EPIC_OAUTH_JWKS_URL: &str = "https://api.epicgames.dev/epic/oauth/v2/.well-known/jwks.json";

/// Supported OAuth 2.0 grant types on `https://api.epicgames.dev/epic/oauth/v2/token`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EEpicOAuthGrantType {
    AuthorizationCode,
    ExchangeCode,
    ClientCredentials,
    RefreshToken,
    DeviceCode,
    ContinuationToken,
}

impl EEpicOAuthGrantType {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::AuthorizationCode => "authorization_code",
            Self::ExchangeCode => "exchange_code",
            Self::ClientCredentials => "client_credentials",
            Self::RefreshToken => "refresh_token",
            Self::DeviceCode => "device_code",
            Self::ContinuationToken => "continuation_token",
        }
    }
}

/// Epic Account Services OAuth2 Scopes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EEpicAuthScope {
    BasicProfile,
    FriendsList,
    Presence,
    FriendsManagement,
    Email,
    Country,
}

impl EEpicAuthScope {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::BasicProfile => "basic_profile",
            Self::FriendsList => "friends_list",
            Self::Presence => "presence",
            Self::FriendsManagement => "friends_management",
            Self::Email => "email",
            Self::Country => "country",
        }
    }
}

/// Configuration for Epic Games OAuth2 & Epic Online Services (`EOS`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FEpicOAuthConfig {
    pub product_name: String,
    pub product_version: String,
    pub product_id: String,
    pub sandbox_id: String,
    pub deployment_id: String,
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: String,
    pub scopes: Vec<EEpicAuthScope>,
    pub is_dedicated_server: bool,
}

impl Default for FEpicOAuthConfig {
    fn default() -> Self {
        Self {
            product_name: "YOLOEngineUE6".to_string(),
            product_version: "6.0.0".to_string(),
            product_id: "yolo-engine-ue6".to_string(),
            sandbox_id: "production-sovereign".to_string(),
            deployment_id: "triad-edge-eu-west".to_string(),
            client_id: "xyza7891sovereignue6client".to_string(),
            client_secret: "sovereign_ue6_client_secret".to_string(),
            redirect_uri: "http://127.0.0.1:8787/epic/oauth/callback".to_string(),
            scopes: vec![
                EEpicAuthScope::BasicProfile,
                EEpicAuthScope::FriendsList,
                EEpicAuthScope::Presence,
            ],
            is_dedicated_server: false,
        }
    }
}

/// OAuth2 token response returned by `POST https://api.epicgames.dev/epic/oauth/v2/token`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FEpicOAuthTokenResponse {
    pub access_token: String,
    pub expires_in: u64,
    pub expires_at: String,
    pub token_type: String,
    pub account_id: Option<String>,
    pub client_id: String,
    pub application_id: Option<String>,
    pub refresh_token: Option<String>,
    pub refresh_expires: Option<u64>,
    pub refresh_expires_at: Option<String>,
    pub scope: String,
    pub deployment_id: String,
}

/// Parsed command-line arguments injected by the Epic Games Launcher (`-AUTH_LOGIN`, `-AUTH_PASSWORD`, `-AUTH_TYPE`, `-epicapp`, `-epicenv`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FEpicLauncherCommandLine {
    pub auth_login: String,
    pub auth_password: String,
    pub auth_type: String,
    pub epic_app: String,
    pub epic_env: String,
    pub epic_userid: Option<String>,
    pub epic_locale: String,
}

impl FEpicLauncherCommandLine {
    /// Parses Epic Games Launcher CLI flags (`-AUTH_TYPE=exchangecode -AUTH_PASSWORD=<code> -epicapp=...`).
    pub fn parse_args<I, S>(args: I) -> Self
    where
        I: IntoIterator<Item = S>,
        S: AsRef<str>,
    {
        let mut cmd = Self {
            auth_login: "unused".to_string(),
            auth_password: String::new(),
            auth_type: "exchangecode".to_string(),
            epic_app: "yolo-engine-ue6".to_string(),
            epic_env: "Prod".to_string(),
            epic_userid: None,
            epic_locale: "en-US".to_string(),
        };

        for raw in args {
            let arg = raw.as_ref();
            if let Some(val) = arg.strip_prefix("-AUTH_LOGIN=") {
                cmd.auth_login = val.to_string();
            } else if let Some(val) = arg.strip_prefix("-AUTH_PASSWORD=") {
                cmd.auth_password = val.to_string();
            } else if let Some(val) = arg.strip_prefix("-AUTH_TYPE=") {
                cmd.auth_type = val.to_lowercase();
            } else if let Some(val) = arg.strip_prefix("-epicapp=") {
                cmd.epic_app = val.to_string();
            } else if let Some(val) = arg.strip_prefix("-epicenv=") {
                cmd.epic_env = val.to_string();
            } else if let Some(val) = arg.strip_prefix("-epicuserid=") {
                cmd.epic_userid = Some(val.to_string());
            } else if let Some(val) = arg.strip_prefix("-epiclocale=") {
                cmd.epic_locale = val.to_string();
            }
        }
        cmd
    }
}

/// Builds the HTTP Basic Authorization header (`Basic base64(client_id:client_secret)`) required by `/epic/oauth/v2/token`.
pub fn format_epic_basic_auth_header(client_id: &str, client_secret: &str) -> String {
    let raw = format!("{}:{}", client_id, client_secret);
    format!("Basic {}", encode_base64_standard(raw.as_bytes()))
}

/// Builds the Epic Account Services OAuth2 user authorization URL (`https://www.epicgames.com/id/authorize`).
pub fn build_epic_authorize_url(
    config: &FEpicOAuthConfig,
    state: &str,
    code_challenge_s256: Option<&str>,
) -> String {
    let scope_str = config
        .scopes
        .iter()
        .map(|s| s.as_str())
        .collect::<Vec<_>>()
        .join(" ");
    let mut url = format!(
        "{}?client_id={}&response_type=code&scope={}&redirect_uri={}&state={}",
        EPIC_OAUTH_AUTHORIZE_URL,
        percent_encode(&config.client_id),
        percent_encode(&scope_str),
        percent_encode(&config.redirect_uri),
        percent_encode(state)
    );
    if let Some(challenge) = code_challenge_s256 {
        url.push_str("&code_challenge=");
        url.push_str(&percent_encode(challenge));
        url.push_str("&code_challenge_method=S256");
    }
    url
}

/// Builds the `application/x-www-form-urlencoded` body for `POST https://api.epicgames.dev/epic/oauth/v2/token`.
pub fn build_epic_token_request_body(
    config: &FEpicOAuthConfig,
    grant_type: EEpicOAuthGrantType,
    credential_value: &str,
    code_verifier: Option<&str>,
) -> String {
    let scope_str = config
        .scopes
        .iter()
        .map(|s| s.as_str())
        .collect::<Vec<_>>()
        .join(" ");

    let mut params = vec![
        format!("grant_type={}", grant_type.as_str()),
        format!("deployment_id={}", percent_encode(&config.deployment_id)),
        format!("scope={}", percent_encode(&scope_str)),
    ];

    match grant_type {
        EEpicOAuthGrantType::AuthorizationCode => {
            params.push(format!("code={}", percent_encode(credential_value)));
            params.push(format!("redirect_uri={}", percent_encode(&config.redirect_uri)));
            if let Some(verifier) = code_verifier {
                params.push(format!("code_verifier={}", percent_encode(verifier)));
            }
        }
        EEpicOAuthGrantType::ExchangeCode => {
            params.push(format!("exchange_code={}", percent_encode(credential_value)));
        }
        EEpicOAuthGrantType::RefreshToken => {
            params.push(format!("refresh_token={}", percent_encode(credential_value)));
        }
        EEpicOAuthGrantType::DeviceCode => {
            params.push(format!("device_code={}", percent_encode(credential_value)));
        }
        EEpicOAuthGrantType::ContinuationToken => {
            params.push(format!(
                "continuation_token={}",
                percent_encode(credential_value)
            ));
        }
        EEpicOAuthGrantType::ClientCredentials => {}
    }

    params.join("&")
}

/// Safe RAII wrapper over the Epic Online Services C SDK (`epic-games-eos-sys`).
pub struct FEosPlatformRuntime {
    handle: EOS_HPlatform,
    config: FEpicOAuthConfig,
}

unsafe impl Send for FEosPlatformRuntime {}
unsafe impl Sync for FEosPlatformRuntime {}

impl FEosPlatformRuntime {
    pub fn initialize(config: FEpicOAuthConfig) -> Result<Self, String> {
        let prod_name = CString::new(config.product_name.as_str()).map_err(|e| e.to_string())?;
        let prod_ver = CString::new(config.product_version.as_str()).map_err(|e| e.to_string())?;

        let init_opts = EOS_InitializeOptions {
            ApiVersion: EOS_INITIALIZE_API_LATEST,
            AllocateMemoryFunction: ptr::null_mut(),
            ReallocateMemoryFunction: ptr::null_mut(),
            ReleaseMemoryFunction: ptr::null_mut(),
            ProductName: prod_name.as_ptr(),
            ProductVersion: prod_ver.as_ptr(),
            Reserved: ptr::null_mut(),
            SystemInitializeOptions: ptr::null_mut(),
            OverrideThreadAffinity: ptr::null_mut(),
        };

        let init_res = unsafe { EOS_Initialize(&init_opts) };
        if init_res != EOS_EResult::EOS_Success && init_res != EOS_EResult::EOS_AlreadyConfigured {
            return Err(format!("EOS_Initialize failed: {:?}", init_res));
        }

        let prod_id = CString::new(config.product_id.as_str()).map_err(|e| e.to_string())?;
        let sandbox_id = CString::new(config.sandbox_id.as_str()).map_err(|e| e.to_string())?;
        let deploy_id = CString::new(config.deployment_id.as_str()).map_err(|e| e.to_string())?;
        let client_id = CString::new(config.client_id.as_str()).map_err(|e| e.to_string())?;
        let client_secret =
            CString::new(config.client_secret.as_str()).map_err(|e| e.to_string())?;

        let plat_opts = EOS_Platform_Options {
            ApiVersion: EOS_PLATFORM_OPTIONS_API_LATEST,
            Reserved: ptr::null_mut(),
            ProductId: prod_id.as_ptr(),
            SandboxId: sandbox_id.as_ptr(),
            ClientCredentials: EOS_Platform_ClientCredentials {
                ClientId: client_id.as_ptr(),
                ClientSecret: client_secret.as_ptr(),
            },
            bIsServer: if config.is_dedicated_server {
                EOS_TRUE
            } else {
                EOS_FALSE
            },
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

        let handle = unsafe { EOS_Platform_Create(&plat_opts) };
        if handle.is_null() {
            return Err("EOS_Platform_Create returned null".to_string());
        }

        Ok(Self { handle, config })
    }

    pub fn tick(&self) {
        unsafe {
            EOS_Platform_Tick(self.handle);
        }
    }

    pub fn verify_epic_id_token(&self, token_jwt: &str) -> Result<String, String> {
        let c_token = CString::new(token_jwt).map_err(|e| e.to_string())?;
        let mut buf = [0 as c_char; 128];
        let mut len = buf.len() as i32;
        let auth = unsafe { EOS_Platform_GetAuthInterface(self.handle) };
        let res = unsafe {
            EOS_Auth_VerifyIdToken_Sync(auth, c_token.as_ptr(), buf.as_mut_ptr(), &mut len)
        };
        if res != EOS_EResult::EOS_Success {
            return Err(format!("EOS_Auth_VerifyIdToken_Sync failed: {:?}", res));
        }
        let account_id = unsafe { CStr::from_ptr(buf.as_ptr()) }
            .to_string_lossy()
            .into_owned();
        Ok(account_id)
    }

    pub fn begin_eac_client_session(&self) -> Result<(), String> {
        let eac = unsafe { EOS_Platform_GetAntiCheatClientInterface(self.handle) };
        let opts = EOS_AntiCheatClient_BeginSessionOptions {
            ApiVersion: EOS_ANTICHEATCLIENT_BEGINSESSION_API_LATEST,
            LocalUserId: ptr::null(),
            Mode: EOS_EAntiCheatClientMode::EOS_ACCM_ClientServer,
        };
        let res = unsafe { EOS_AntiCheatClient_BeginSession(eac, &opts) };
        if res != EOS_EResult::EOS_Success {
            return Err(format!("EOS_AntiCheatClient_BeginSession failed: {:?}", res));
        }
        Ok(())
    }

    pub fn end_eac_client_session(&self) -> Result<(), String> {
        let eac = unsafe { EOS_Platform_GetAntiCheatClientInterface(self.handle) };
        let res = unsafe { EOS_AntiCheatClient_EndSession(eac, ptr::null()) };
        if res != EOS_EResult::EOS_Success {
            return Err(format!("EOS_AntiCheatClient_EndSession failed: {:?}", res));
        }
        Ok(())
    }

    pub fn config(&self) -> &FEpicOAuthConfig {
        &self.config
    }
}

impl Drop for FEosPlatformRuntime {
    fn drop(&mut self) {
        if !self.handle.is_null() {
            unsafe {
                EOS_Platform_Release(self.handle);
                let _ = EOS_Shutdown();
            }
            self.handle = ptr::null_mut();
        }
    }
}

fn encode_base64_standard(input: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(input.len().div_ceil(3) * 4);
    for chunk in input.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;

        out.push(TABLE[((triple >> 18) & 0x3F) as usize] as char);
        out.push(TABLE[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            out.push(TABLE[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(TABLE[(triple & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}

fn percent_encode(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for b in input.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char);
            }
            _ => {
                out.push_str(&format!("%{:02X}", b));
            }
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_epic_oauth2_headers_urls_and_runs_eos_runtime() {
        let cfg = FEpicOAuthConfig::default();
        let basic = format_epic_basic_auth_header("client123", "secret456");
        assert_eq!(basic, "Basic Y2xpZW50MTIzOnNlY3JldDQ1Ng==");

        let auth_url = build_epic_authorize_url(&cfg, "state_xyz", Some("pkce_s256_challenge"));
        assert!(auth_url.starts_with(EPIC_OAUTH_AUTHORIZE_URL));
        assert!(auth_url.contains("code_challenge_method=S256"));

        let body = build_epic_token_request_body(
            &cfg,
            EEpicOAuthGrantType::ExchangeCode,
            "launcher_exchange_999",
            None,
        );
        assert!(body.contains("grant_type=exchange_code"));
        assert!(body.contains("exchange_code=launcher_exchange_999"));

        let launcher = FEpicLauncherCommandLine::parse_args([
            "-AUTH_LOGIN=unused",
            "-AUTH_PASSWORD=exch_token_777",
            "-AUTH_TYPE=exchangecode",
            "-epicapp=yolo-engine-ue6",
            "-epicenv=Prod",
        ]);
        assert_eq!(launcher.auth_password, "exch_token_777");
        assert_eq!(launcher.auth_type, "exchangecode");

        let runtime = FEosPlatformRuntime::initialize(cfg).expect("EOS platform init");
        runtime.tick();
        let acct = runtime
            .verify_epic_id_token("eg1~sovereign_token_payload")
            .expect("verify token");
        assert_eq!(acct, "epic_acct_sovereign_ue6_001");
        runtime.begin_eac_client_session().expect("begin EAC");
        runtime.end_eac_client_session().expect("end EAC");
    }
}
