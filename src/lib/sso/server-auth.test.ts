import { afterEach, describe, expect, it } from "vitest";
import { createAppSessionJwt } from "./session";
import {
	API_SSO_AUTH_EXEMPT_PATHS,
	enforceApiSsoAuth,
	isApiRequestPath,
	isExemptFromSsoAuth,
} from "./server-auth";

describe("sso api middleware helpers", () => {
	const originalSessionSecret = process.env.SSO_SESSION_SECRET;
	const originalWhitelistEnabled = process.env.SSO_COMPANY_ID_WHITELIST_ENABLED;
	const originalWhitelist = process.env.SSO_COMPANY_ID_WHITELIST;

	afterEach(() => {
		if (originalSessionSecret === undefined) {
			delete process.env.SSO_SESSION_SECRET;
		} else {
			process.env.SSO_SESSION_SECRET = originalSessionSecret;
		}

		if (originalWhitelistEnabled === undefined) {
			delete process.env.SSO_COMPANY_ID_WHITELIST_ENABLED;
		} else {
			process.env.SSO_COMPANY_ID_WHITELIST_ENABLED = originalWhitelistEnabled;
		}

		if (originalWhitelist === undefined) {
			delete process.env.SSO_COMPANY_ID_WHITELIST;
		} else {
			process.env.SSO_COMPANY_ID_WHITELIST = originalWhitelist;
		}
	});

	it("recognizes api paths", () => {
		expect(isApiRequestPath("/api/rtc/token")).toBe(true);
		expect(isApiRequestPath("/app")).toBe(false);
	});

	it("tracks explicit anonymous exemptions", () => {
		expect(API_SSO_AUTH_EXEMPT_PATHS.has("/api/mobile-viewer/session")).toBe(
			true,
		);
		expect(isExemptFromSsoAuth("/api/sso/login")).toBe(true);
		expect(isExemptFromSsoAuth("/api/rtc/token")).toBe(false);
	});

	it("rejects protected api requests without a session cookie", async () => {
		const response = enforceApiSsoAuth(
			new Request("https://example.com/api/rtc/token"),
		);

		expect(response?.status).toBe(401);
		await expect(response?.json()).resolves.toEqual({
			code: 1,
			errorCode: "session_missing",
			msg: "Session cookie missing",
		});
	});

	it("rejects protected api requests with an invalid session cookie", async () => {
		process.env.SSO_SESSION_SECRET = "session-secret";

		const response = enforceApiSsoAuth(
			new Request("https://example.com/api/rtc/token", {
				headers: {
					Cookie: "stt-demo-dev-token=invalid-token",
				},
			}),
		);

		expect(response?.status).toBe(401);
		expect(response?.headers.get("Set-Cookie")).toContain(
			"stt-demo-dev-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
		);
		await expect(response?.json()).resolves.toEqual({
			code: 1,
			errorCode: "session_expired",
			msg: "Session expired",
		});
	});

	it("allows protected api requests with a valid session cookie", () => {
		process.env.SSO_SESSION_SECRET = "session-secret";
		process.env.SSO_COMPANY_ID_WHITELIST_ENABLED = "false";
		const token = createAppSessionJwt({
			secret: "session-secret",
			userInfo: { accountUid: "123", companyId: 1361652 },
		});

		const response = enforceApiSsoAuth(
			new Request("https://example.com/api/rtc/token", {
				headers: {
					Cookie: `stt-demo-dev-token=${token}`,
				},
			}),
		);

		expect(response).toBeNull();
	});

	it("does not enforce company whitelist when the switch is off", () => {
		process.env.SSO_SESSION_SECRET = "session-secret";
		process.env.SSO_COMPANY_ID_WHITELIST_ENABLED = "false";
		process.env.SSO_COMPANY_ID_WHITELIST = "1361652";
		const token = createAppSessionJwt({
			secret: "session-secret",
			userInfo: { accountUid: "123", companyId: 20935665 },
		});

		const response = enforceApiSsoAuth(
			new Request("https://example.com/api/rtc/token", {
				headers: {
					Cookie: `stt-demo-dev-token=${token}`,
				},
			}),
		);

		expect(response).toBeNull();
	});

	it("rejects protected api requests when the switch is on but the whitelist is empty", async () => {
		process.env.SSO_SESSION_SECRET = "session-secret";
		process.env.SSO_COMPANY_ID_WHITELIST_ENABLED = "true";
		process.env.SSO_COMPANY_ID_WHITELIST = "[]";
		const token = createAppSessionJwt({
			secret: "session-secret",
			userInfo: { accountUid: "123", companyId: 20935665 },
		});

		const response = enforceApiSsoAuth(
			new Request("https://example.com/api/rtc/token", {
				headers: {
					Cookie: `stt-demo-dev-token=${token}`,
				},
			}),
		);

		expect(response?.status).toBe(403);
		await expect(response?.json()).resolves.toEqual({
			code: 1,
			errorCode: "unknown_error",
			msg: "Company is not allowed",
		});
	});

	it("rejects protected api requests when the company is not whitelisted", async () => {
		process.env.SSO_SESSION_SECRET = "session-secret";
		process.env.SSO_COMPANY_ID_WHITELIST_ENABLED = "true";
		process.env.SSO_COMPANY_ID_WHITELIST = "1361652";
		const token = createAppSessionJwt({
			secret: "session-secret",
			userInfo: { accountUid: "123", companyId: 20935665 },
		});

		const response = enforceApiSsoAuth(
			new Request("https://example.com/api/rtc/token", {
				headers: {
					Cookie: `stt-demo-dev-token=${token}`,
				},
			}),
		);

		expect(response?.status).toBe(403);
		await expect(response?.json()).resolves.toEqual({
			code: 1,
			errorCode: "unknown_error",
			msg: "Company is not allowed",
		});
	});

	it("allows protected api requests when the company is whitelisted", () => {
		process.env.SSO_SESSION_SECRET = "session-secret";
		process.env.SSO_COMPANY_ID_WHITELIST_ENABLED = "true";
		process.env.SSO_COMPANY_ID_WHITELIST = "1361652,20935665";
		const token = createAppSessionJwt({
			secret: "session-secret",
			userInfo: { accountUid: "123", companyId: 20935665 },
		});

		const response = enforceApiSsoAuth(
			new Request("https://example.com/api/rtc/token", {
				headers: {
					Cookie: `stt-demo-dev-token=${token}`,
				},
			}),
		);

		expect(response).toBeNull();
	});

	it("allows explicit anonymous api exemptions without a session cookie", () => {
		const response = enforceApiSsoAuth(
			new Request("https://example.com/api/mobile-viewer/session"),
		);

		expect(response).toBeNull();
	});

	it("ignores non-api routes", () => {
		const response = enforceApiSsoAuth(new Request("https://example.com/app"));

		expect(response).toBeNull();
	});
});
