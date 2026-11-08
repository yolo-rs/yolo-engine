// SPDX-License-Identifier: MIT OR Apache-2.0
/**
 * YOLO Engine 6.0 (UE6) — `@yolo-rs/epic-games-sdk/oauth`
 *
 * Official Epic Games OAuth 2.0 & Epic Account Services (`EAS`) / Epic Online Services (`EOS`)
 * Web API client for Bun v1.4.4+ & TypeScript.
 *
 * Endpoints:
 * - Authorization: `https://www.epicgames.com/id/authorize`
 * - Token Request: `https://api.epicgames.dev/epic/oauth/v2/token`
 * - Token Info:    `https://api.epicgames.dev/epic/oauth/v2/tokenInfo`
 * - Token Revoke:  `https://api.epicgames.dev/epic/oauth/v2/revoke` (RFC 7009)
 * - JWKS:          `https://api.epicgames.dev/epic/oauth/v2/.well-known/jwks.json`
 */

import { createHash, randomBytes } from "node:crypto";

export const EPIC_OAUTH_ENDPOINTS = {
  authorize: "https://www.epicgames.com/id/authorize",
  token: "https://api.epicgames.dev/epic/oauth/v2/token",
  tokenInfo: "https://api.epicgames.dev/epic/oauth/v2/tokenInfo",
  revoke: "https://api.epicgames.dev/epic/oauth/v2/revoke",
  jwks: "https://api.epicgames.dev/epic/oauth/v2/.well-known/jwks.json",
  userInfo: "https://api.epicgames.dev/epic/id/v2/accounts",
} as const;

export type EpicOAuthGrantType =
  | "authorization_code"
  | "exchange_code"
  | "client_credentials"
  | "refresh_token"
  | "device_code"
  | "continuation_token";

export type EpicAuthScope =
  | "basic_profile"
  | "friends_list"
  | "presence"
  | "friends_management"
  | "email"
  | "country";

export interface EpicOAuthConfig {
  readonly productName: string;
  readonly productVersion: string;
  readonly productId: string;
  readonly sandboxId: string;
  readonly deploymentId: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  readonly scopes: readonly EpicAuthScope[];
}

export interface EpicOAuthTokenResponse {
  readonly access_token: string;
  readonly expires_in: number;
  readonly expires_at: string;
  readonly token_type: "bearer";
  readonly account_id?: string;
  readonly client_id: string;
  readonly application_id?: string;
  readonly refresh_token?: string;
  readonly refresh_expires?: number;
  readonly refresh_expires_at?: string;
  readonly scope: string;
  readonly deployment_id?: string;
}

export interface EpicLauncherCliArgs {
  readonly authLogin: string;
  readonly authPassword: string;
  readonly authType: string;
  readonly epicApp: string;
  readonly epicEnv: string;
  readonly epicUserId?: string;
  readonly epicLocale: string;
}

export interface PkcePair {
  readonly codeVerifier: string;
  readonly codeChallenge: string;
  readonly codeChallengeMethod: "S256";
}

export const DEFAULT_EPIC_OAUTH_CONFIG: EpicOAuthConfig = {
  productName: "YOLOEngineUE6",
  productVersion: "6.0.0",
  productId: process.env.EPIC_PRODUCT_ID ?? "yolo-engine-ue6",
  sandboxId: process.env.EPIC_SANDBOX_ID ?? "production-sovereign",
  deploymentId: process.env.EPIC_DEPLOYMENT_ID ?? "triad-edge-eu-west",
  clientId: process.env.EPIC_CLIENT_ID ?? "xyza7891sovereignue6client",
  clientSecret: process.env.EPIC_CLIENT_SECRET ?? "sovereign_ue6_client_secret",
  redirectUri: process.env.EPIC_REDIRECT_URI ?? "http://127.0.0.1:8787/epic/oauth/callback",
  scopes: ["basic_profile", "friends_list", "presence"],
};

/**
 * Generates an RFC 7636 PKCE (`S256`) verifier and challenge pair for Epic Account Services OAuth2.
 */
export function generateEpicPkcePair(): PkcePair {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: "S256",
  };
}

/**
 * Builds the `Basic base64(client_id:client_secret)` Authorization header required by `https://api.epicgames.dev/epic/oauth/v2/token`.
 */
export function formatEpicBasicAuthHeader(clientId: string, clientSecret: string): string {
  const encoded = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
  return `Basic ${encoded}`;
}

/**
 * Builds the Epic Games OAuth2 authorization redirect URL (`https://www.epicgames.com/id/authorize`).
 */
export function buildEpicAuthorizeUrl(
  config: EpicOAuthConfig,
  state: string,
  pkce?: PkcePair,
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    scope: config.scopes.join(" "),
    redirect_uri: config.redirectUri,
    state,
  });
  if (pkce) {
    params.set("code_challenge", pkce.codeChallenge);
    params.set("code_challenge_method", pkce.codeChallengeMethod);
  }
  return `${EPIC_OAUTH_ENDPOINTS.authorize}?${params.toString()}`;
}

/**
 * Builds the `URLSearchParams` body for `POST https://api.epicgames.dev/epic/oauth/v2/token`.
 */
export function buildEpicTokenRequestBody(
  config: EpicOAuthConfig,
  grantType: EpicOAuthGrantType,
  options: {
    readonly code?: string;
    readonly exchangeCode?: string;
    readonly refreshToken?: string;
    readonly deviceCode?: string;
    readonly continuationToken?: string;
    readonly codeVerifier?: string;
  } = {},
): URLSearchParams {
  const params = new URLSearchParams({
    grant_type: grantType,
    deployment_id: config.deploymentId,
    scope: config.scopes.join(" "),
  });

  switch (grantType) {
    case "authorization_code":
      if (options.code) params.set("code", options.code);
      params.set("redirect_uri", config.redirectUri);
      if (options.codeVerifier) params.set("code_verifier", options.codeVerifier);
      break;
    case "exchange_code":
      if (options.exchangeCode) params.set("exchange_code", options.exchangeCode);
      break;
    case "refresh_token":
      if (options.refreshToken) params.set("refresh_token", options.refreshToken);
      break;
    case "device_code":
      if (options.deviceCode) params.set("device_code", options.deviceCode);
      break;
    case "continuation_token":
      if (options.continuationToken) params.set("continuation_token", options.continuationToken);
      break;
    case "client_credentials":
      break;
  }

  return params;
}

/**
 * Parses Epic Games Launcher CLI arguments (`-AUTH_LOGIN=unused -AUTH_PASSWORD=<code > -AUTH_TYPE=exchangecode -epicapp=...`).
 */
export function parseEpicLauncherCliArgs(argv: readonly string[]): EpicLauncherCliArgs {
  let authLogin = "unused";
  let authPassword = "";
  let authType = "exchangecode";
  let epicApp = "yolo-engine-ue6";
  let epicEnv = "Prod";
  let epicUserId: string | undefined;
  let epicLocale = "en-US";

  for (const arg of argv) {
    if (arg.startsWith("-AUTH_LOGIN=")) authLogin = arg.slice("-AUTH_LOGIN=".length);
    else if (arg.startsWith("-AUTH_PASSWORD=")) authPassword = arg.slice("-AUTH_PASSWORD=".length);
    else if (arg.startsWith("-AUTH_TYPE=")) authType = arg.slice("-AUTH_TYPE=".length).toLowerCase();
    else if (arg.startsWith("-epicapp=")) epicApp = arg.slice("-epicapp=".length);
    else if (arg.startsWith("-epicenv=")) epicEnv = arg.slice("-epicenv=".length);
    else if (arg.startsWith("-epicuserid=")) epicUserId = arg.slice("-epicuserid=".length);
    else if (arg.startsWith("-epiclocale=")) epicLocale = arg.slice("-epiclocale=".length);
  }

  return {
    authLogin,
    authPassword,
    authType,
    epicApp,
    epicEnv,
    epicUserId,
    epicLocale,
  };
}

/**
 * Full Epic Games OAuth2 Client supporting `authorization_code`, `exchange_code`,
 * `client_credentials`, `refresh_token`, and RFC 7009 token revocation.
 */
export class EpicGamesOAuthClient {
  readonly config: EpicOAuthConfig;
  private readonly fetchImpl: typeof fetch;

  constructor(config: Partial<EpicOAuthConfig> = {}, fetchImpl: typeof fetch = fetch) {
    this.config = { ...DEFAULT_EPIC_OAUTH_CONFIG, ...config };
    this.fetchImpl = fetchImpl;
  }

  createAuthorizeUrl(state: string, pkce?: PkcePair): string {
    return buildEpicAuthorizeUrl(this.config, state, pkce);
  }

  async requestToken(
    grantType: EpicOAuthGrantType,
    options: {
      readonly code?: string;
      readonly exchangeCode?: string;
      readonly refreshToken?: string;
      readonly deviceCode?: string;
      readonly continuationToken?: string;
      readonly codeVerifier?: string;
    } = {},
  ): Promise<EpicOAuthTokenResponse> {
    const body = buildEpicTokenRequestBody(this.config, grantType, options);
    const response = await this.fetchImpl(EPIC_OAUTH_ENDPOINTS.token, {
      method: "POST",
      headers: {
        Authorization: formatEpicBasicAuthHeader(this.config.clientId, this.config.clientSecret),
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Epic OAuth2 token request failed (${response.status}): ${errText}`);
    }

    return (await response.json()) as EpicOAuthTokenResponse;
  }

  async revokeToken(token: string): Promise<void> {
    const body = new URLSearchParams({ token });
    const response = await this.fetchImpl(EPIC_OAUTH_ENDPOINTS.revoke, {
      method: "POST",
      headers: {
        Authorization: formatEpicBasicAuthHeader(this.config.clientId, this.config.clientSecret),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Epic OAuth2 token revocation failed (${response.status}): ${errText}`);
    }
  }
}
