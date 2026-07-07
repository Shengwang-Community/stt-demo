import { describe, expect, it } from "vitest";
import {
	buildLogoutUrl,
	buildSsoAuthorizeUrl,
	buildSsoLoginUrl,
	buildSsoTokenUrl,
	getServerSsoBaseUrl,
	getServerSsoCallbackRedirectUri,
	getServerSsoClientId,
	getServerSsoClientSecret,
	getServerSsoCompanyIdWhitelist,
	getServerSsoCompanyIdWhitelistEnabled,
	getServerSsoOpenBaseUrl,
	getServerSsoPostLogoutRedirectUri,
	getServerSsoScope,
	getServerSsoSessionSecret,
	REMOTE_SSO_AUTHORIZE,
	REMOTE_SSO_TOKEN,
	REMOTE_USER_INFO,
} from "./constants";

describe("sso constants", () => {
	it("matches the OAuth and user-info remote paths", () => {
		expect(REMOTE_SSO_AUTHORIZE).toBe("/api/v0/oauth/authorize");
		expect(REMOTE_SSO_TOKEN).toBe("/api/v0/oauth/token");
		expect(REMOTE_USER_INFO).toBe("/api/v0/customer/company/basic-info");
	});

	it("builds OAuth authorize urls for the server callback", () => {
		const url = new URL(
			buildSsoAuthorizeUrl({
				baseUrl: "https://sso.example.com",
				clientId: "client-id",
				redirectUri: "http://localhost:3000/api/sso/callback",
				scope: "profile",
			}),
		);

		expect(url.origin).toBe("https://sso.example.com");
		expect(url.pathname).toBe("/api/v0/oauth/authorize");
		expect(url.searchParams.get("response_type")).toBe("code");
		expect(url.searchParams.get("client_id")).toBe("client-id");
		expect(url.searchParams.get("scope")).toBe("profile");
		expect(url.searchParams.get("redirect_uri")).toBe(
			"http://localhost:3000/api/sso/callback",
		);
	});

	it("builds official SSO login urls from the OAuth authorize endpoint", () => {
		const redirectUri = "http://localhost:3000/api/sso/callback";

		const url = new URL(
			buildSsoLoginUrl({
				baseUrl: "https://sso.example.com",
				clientId: "stt-demo",
				redirectUri,
				scope: "profile,email",
			}),
		);

		expect(url.origin).toBe("https://sso.example.com");
		expect(url.pathname).toBe("/api/v0/oauth/authorize");
		expect(url.searchParams.get("response_type")).toBe("code");
		expect(url.searchParams.get("client_id")).toBe("stt-demo");
		expect(url.searchParams.get("scope")).toBe("profile,email");
		expect(url.searchParams.get("redirect_uri")).toBe(redirectUri);
	});

	it("reads only the configured SSO web base URL from server env", () => {
		expect(getServerSsoBaseUrl({})).toBe("");
		expect(getServerSsoBaseUrl({ VITE_LOCALE: "en-US" })).toBe("");
		expect(
			getServerSsoBaseUrl({
				SSO_BASE_URL: "https://sso.example.com/",
			}),
		).toBe("https://sso.example.com");
	});

	it("builds OAuth urls from an explicit SSO web base URL", () => {
		expect(
			buildSsoTokenUrl({
				baseUrl: "https://sso.example.com/",
			}),
		).toBe("https://sso.example.com/api/v0/oauth/token");

		expect(
			new URL(
				buildSsoLoginUrl({
					baseUrl: "https://sso.example.com/",
					clientId: "client-id",
					redirectUri: "http://localhost:3000/api/sso/callback",
					scope: "profile",
				}),
			).origin,
		).toBe("https://sso.example.com");
		expect(
			new URL(
				buildSsoLoginUrl({
					baseUrl: "https://sso.example.com/",
					clientId: "client-id",
					redirectUri: "http://localhost:3000/api/sso/callback",
					scope: "profile",
				}),
			).pathname,
		).toBe("/api/v0/oauth/authorize");
	});

	it("builds logout urls from an explicit SSO web base URL", () => {
		expect(
			buildLogoutUrl({
				baseUrl: "https://sso.example.com",
				redirectUri: "http://localhost:3000",
			}),
		).toBe(
			"https://sso.example.com/api/v0/logout?redirect_uri=http%3A%2F%2Flocalhost%3A3000",
		);
	});

	it("builds the server-owned callback redirect URI from the incoming request", () => {
		expect(
			getServerSsoCallbackRedirectUri(
				"https://stt-demo.example.com/api/sso/login",
				{},
			),
		).toBe("https://stt-demo.example.com/api/sso/callback");
	});

	it("rejects SSO OpenAPI hosts that point to the app itself", () => {
		const env = {
			SSO_OPEN_API_BASE_URL: "http://localhost:3000",
		};
		const requestUrl = "http://localhost:3000/api/sso/callback";

		expect(getServerSsoOpenBaseUrl(env, requestUrl)).toBe("");
	});

	it("reads only the configured SSO OpenAPI base URL", () => {
		expect(getServerSsoOpenBaseUrl({})).toBe("");
		expect(
			getServerSsoOpenBaseUrl({
				SSO_OPEN_API_BASE_URL: "https://sso-open.example.com/",
			}),
		).toBe("https://sso-open.example.com");
	});

	it("uses an explicit server callback redirect URI when configured", () => {
		expect(
			getServerSsoCallbackRedirectUri(
				"https://stt-demo.example.com/api/sso/login",
				{
					VITE_SSO_REDIRECT_URI: "https://custom.example.com/api/sso/callback",
				},
			),
		).toBe("https://custom.example.com/api/sso/callback");
	});

	it("upgrades an old local root callback URI to the server-owned callback route", () => {
		expect(
			getServerSsoCallbackRedirectUri("http://127.0.0.1:3001/api/sso/login", {
				VITE_SSO_REDIRECT_URI: "http://localhost:3000/",
			}),
		).toBe("http://127.0.0.1:3001/api/sso/callback");
	});

	it("builds the post logout redirect URI from the incoming request", () => {
		expect(
			getServerSsoPostLogoutRedirectUri(
				"https://stt-demo.example.com/api/sso/logout",
			),
		).toBe("https://stt-demo.example.com/");
	});

	it("reads OAuth client settings only from server env", () => {
		expect(getServerSsoClientId({})).toBe("");
		expect(getServerSsoScope({})).toBe("");
		expect(getServerSsoClientSecret({})).toBe("");
		expect(getServerSsoSessionSecret({})).toBe("");
		expect(
			getServerSsoClientId({
				SSO_CLIENT_ID: "stt-demo",
			}),
		).toBe("stt-demo");
		expect(
			getServerSsoScope({
				SSO_SCOPE: "profile,email",
			}),
		).toBe("profile,email");
		expect(
			getServerSsoClientSecret({
				SSO_CLIENT_SECRET: "secret",
			}),
		).toBe("secret");
		expect(
			getServerSsoSessionSecret({
				SSO_SESSION_SECRET: "session-secret",
			}),
		).toBe("session-secret");
		expect(
			getServerSsoCompanyIdWhitelist({
				SSO_COMPANY_ID_WHITELIST: "1361652,  20935665, foo, 0, -1",
			}),
		).toEqual([1361652, 20935665]);
		expect(getServerSsoCompanyIdWhitelistEnabled({})).toBe(false);
		expect(
			getServerSsoCompanyIdWhitelistEnabled({
				SSO_COMPANY_ID_WHITELIST_ENABLED: "true",
			}),
		).toBe(true);
		expect(
			getServerSsoCompanyIdWhitelistEnabled({
				SSO_COMPANY_ID_WHITELIST_ENABLED: "1",
			}),
		).toBe(true);
	});
});
