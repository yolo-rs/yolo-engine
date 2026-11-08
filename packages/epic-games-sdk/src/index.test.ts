// SPDX-License-Identifier: MIT OR Apache-2.0
import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  buildEpicAuthorizeUrl,
  buildEpicTokenRequestBody,
  DEFAULT_EPIC_OAUTH_CONFIG,
  EPIC_OAUTH_ENDPOINTS,
  EpicGamesOAuthClient,
   EOS_EResult,
  formatEpicBasicAuthHeader,
  generateEpicPkcePair,
  parseEpicLauncherCliArgs,
  resolveEosNativeSdk,
} from "./index.ts";
import { existsSync } from "node:fs";

describe("@yolo-rs/epic-games-sdk — Epic Games OAuth2, EOS C/C++20 SDK & Rust Crates", () => {
  test("generates PKCE S256 challenge, Basic Auth header, and authorize URL", () => {
    const pkce = generateEpicPkcePair();
    expect(pkce.codeChallengeMethod).toBe("S256");
    expect(pkce.codeVerifier.length).toBeGreaterThan(32);
    expect(pkce.codeChallenge.length).toBeGreaterThan(32);

    const basic = formatEpicBasicAuthHeader("client123", "secret456");
    expect(basic).toBe("Basic Y2xpZW50MTIzOnNlY3JldDQ1Ng==");

    const url = buildEpicAuthorizeUrl(DEFAULT_EPIC_OAUTH_CONFIG, "csrf_state_01", pkce);
    expect(url.startsWith(EPIC_OAUTH_ENDPOINTS.authorize)).toBe(true);
    expect(url.includes("code_challenge_method=S256")).toBe(true);
  });

  test("builds token request bodies for exchange_code, authorization_code, and client_credentials", () => {
    const exchBody = buildEpicTokenRequestBody(DEFAULT_EPIC_OAUTH_CONFIG, "exchange_code", {
      exchangeCode: "launcher_code_abc",
    });
    expect(exchBody.get("grant_type")).toBe("exchange_code");
    expect(exchBody.get("exchange_code")).toBe("launcher_code_abc");
    expect(exchBody.get("deployment_id")).toBe(DEFAULT_EPIC_OAUTH_CONFIG.deploymentId);

    const parsedCli = parseEpicLauncherCliArgs([
      "-AUTH_LOGIN=unused",
      "-AUTH_PASSWORD=epic_exch_999",
      "-AUTH_TYPE=exchangecode",
      "-epicapp=yolo-engine-ue6",
      "-epicenv=Prod",
    ]);
    expect(parsedCli.authPassword).toBe("epic_exch_999");
    expect(parsedCli.authType).toBe("exchangecode");
  });

  test("executes OAuth2 token exchange with mock fetch and verifies C/C++20/Rust SDK files exist", async () => {
    const mockFetch = (async () =>
      new Response(
        JSON.stringify({
          access_token: "eg1~sovereign_epic_access_token",
          expires_in: 7200,
          expires_at: "2026-11-09T00:00:00Z",
          token_type: "bearer",
          account_id: "epic_acct_sovereign_ue6_001",
          client_id: DEFAULT_EPIC_OAUTH_CONFIG.clientId,
          scope: "basic_profile friends_list presence",
          deployment_id: DEFAULT_EPIC_OAUTH_CONFIG.deploymentId,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )) as unknown as typeof fetch;

    const client = new EpicGamesOAuthClient({}, mockFetch);
    const token = await client.requestToken("exchange_code", { exchangeCode: "exch_123" });
    expect(token.access_token).toBe("eg1~sovereign_epic_access_token");
    expect(token.account_id).toBe("epic_acct_sovereign_ue6_001");

    const engineRoot = resolve(import.meta.dir, "..", "..", "..");
    const sdk = resolveEosNativeSdk(engineRoot);
    expect(existsSync(sdk.headerPath)).toBe(true);
    expect(existsSync(sdk.cppHeaderPath)).toBe(true);
    expect(existsSync(sdk.cShimSourcePath)).toBe(true);
    expect(existsSync(sdk.rustSysCratePath)).toBe(true);
    expect(existsSync(sdk.rustAuthCratePath)).toBe(true);
    expect(EOS_EResult.EOS_Success).toBe(0);
  });
});
