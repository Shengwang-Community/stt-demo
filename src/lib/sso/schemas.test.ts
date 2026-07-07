import { describe, expect, it } from "vitest";
import { parseRemoteResponse, parseTokenResponse } from "./schemas";

describe("sso response parsers", () => {
	it("parses generic remote responses", () => {
		expect(
			parseRemoteResponse({
				code: 0,
				msg: "ok",
				tip: "done",
				data: { accountUid: "123", displayName: "Ada" },
			}),
		).toEqual({
			code: 0,
			msg: "ok",
			tip: "done",
			data: { accountUid: "123", displayName: "Ada" },
		});
	});

	it("parses generic remote responses without code", () => {
		expect(parseRemoteResponse({ data: { ok: true } })).toEqual({
			code: undefined,
			msg: undefined,
			tip: undefined,
			data: { ok: true },
		});
	});

	it("rejects generic responses with non-numeric code", () => {
		expect(() => parseRemoteResponse({ code: "0", data: {} })).toThrow(
			"Invalid remote response",
		);
	});

	it("parses OAuth token responses", () => {
		expect(
			parseTokenResponse({
				access_token: "access-token",
				token_type: "Bearer",
				expires_in: 7199,
				refresh_token: "refresh-token",
				scope: "basic_info",
			}),
		).toEqual({
			accessToken: "access-token",
			tokenType: "Bearer",
			expiresIn: 7199,
			refreshToken: "refresh-token",
			scope: "basic_info",
		});
	});

	it("parses Shengwang OAuth token responses with array scope", () => {
		expect(
			parseTokenResponse({
				access_token: "01f67e929bc8b08dcc16184d30317158035fb8b8",
				token_type: "Bearer",
				expires_in: 7199,
				refresh_token: "041eab3d249d62914fbcfc23efbca72586bc273b",
				scope: ["basic_info"],
			}),
		).toEqual({
			accessToken: "01f67e929bc8b08dcc16184d30317158035fb8b8",
			tokenType: "Bearer",
			expiresIn: 7199,
			refreshToken: "041eab3d249d62914fbcfc23efbca72586bc273b",
			scope: ["basic_info"],
		});
	});

	it("parses wrapped OAuth token responses", () => {
		expect(
			parseTokenResponse({
				code: 0,
				msg: "ok",
				data: {
					access_token: "access-token",
					token_type: "Bearer",
					expires_in: 7199,
				},
			}),
		).toEqual({
			accessToken: "access-token",
			tokenType: "Bearer",
			expiresIn: 7199,
			refreshToken: undefined,
			scope: undefined,
		});
	});

	it("parses camelCase OAuth token responses", () => {
		expect(
			parseTokenResponse({
				code: 0,
				data: {
					accessToken: "access-token",
					tokenType: "Bearer",
					expiresIn: 7199,
					refreshToken: "refresh-token",
					scope: "basic_info",
				},
			}),
		).toEqual({
			accessToken: "access-token",
			tokenType: "Bearer",
			expiresIn: 7199,
			refreshToken: "refresh-token",
			scope: "basic_info",
		});
	});

	it("reports wrapped OAuth token errors", () => {
		expect(() =>
			parseTokenResponse({
				code: 1,
				msg: "invalid grant",
			}),
		).toThrow("invalid grant");
	});

	it("rejects OAuth token responses without an access token", () => {
		expect(() => parseTokenResponse({ token_type: "Bearer" })).toThrow(
			"Invalid SSO token response",
		);
	});
});
