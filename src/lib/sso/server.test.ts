import { describe, expect, it } from "vitest";
import {
	buildSsoTokenClearCookieHeader,
	buildSsoTokenSetCookieHeader,
	getSsoTokenCookieFromRequest,
	getSsoTokenCookieName,
} from "./server";

describe("sso server helpers", () => {
	it("builds environment-scoped token cookie names", () => {
		expect(getSsoTokenCookieName({ APP_ENV: "staging" })).toBe(
			"stt-demo-staging-token",
		);
		expect(getSsoTokenCookieName({ APP_ENV: "preprod" })).toBe(
			"stt-demo-preprod-token",
		);
		expect(getSsoTokenCookieName({ APP_ENV: "local" })).toBe(
			"stt-demo-dev-token",
		);
		expect(getSsoTokenCookieName({})).toBe("stt-demo-dev-token");
	});

	it("builds the token set-cookie header", () => {
		expect(
			buildSsoTokenSetCookieHeader("abc.def.ghi", { APP_ENV: "staging" }),
		).toBe(
			"stt-demo-staging-token=abc.def.ghi; Path=/; HttpOnly; SameSite=Lax; Max-Age=259200",
		);
	});

	it("builds the token clear-cookie header", () => {
		expect(buildSsoTokenClearCookieHeader({ APP_ENV: "staging" })).toBe(
			"stt-demo-staging-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
		);
	});

	it("reads the app session token cookie", () => {
		const request = new Request("https://example.com/api/sso/userInfo", {
			headers: {
				Cookie: "foo=bar; stt-demo-staging-token=cookie-token; theme=dark",
			},
		});

		expect(getSsoTokenCookieFromRequest(request, { APP_ENV: "staging" })).toBe(
			"cookie-token",
		);
	});

	it("returns null when no token is present", () => {
		const request = new Request("https://example.com/api/sso/userInfo");

		expect(getSsoTokenCookieFromRequest(request)).toBeNull();
	});
});
