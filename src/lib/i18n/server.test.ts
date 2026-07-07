import { describe, expect, it } from "vitest";
import {
	buildLocaleSetCookieHeader,
	getLocaleCookieFromRequest,
	resolveRequestLocale,
} from "./server";

describe("i18n server helpers", () => {
	it("reads locale cookie from request", () => {
		const request = new Request("https://example.com", {
			headers: {
				Cookie: "foo=bar; stt-demo-locale=zh-CN; theme=dark",
			},
		});

		expect(getLocaleCookieFromRequest(request)).toBe("zh-CN");
	});

	it("builds locale set-cookie header", () => {
		expect(buildLocaleSetCookieHeader("en-US")).toBe(
			"stt-demo-locale=en-US; Path=/; SameSite=Lax; Max-Age=31536000",
		);
	});

	it("uses locale cookie before environment default", () => {
		const request = new Request("https://example.com", {
			headers: {
				Cookie: "stt-demo-locale=zh-CN",
			},
		});

		expect(
			resolveRequestLocale({
				request,
				env: { VITE_LOCALE: "en-US" },
			}),
		).toBe("zh-CN");
	});

	it("falls back to VITE_LOCALE when cookie is absent", () => {
		const request = new Request("https://example.com");

		expect(
			resolveRequestLocale({
				request,
				env: { VITE_LOCALE: "zh-CN" },
			}),
		).toBe("zh-CN");
	});
});
