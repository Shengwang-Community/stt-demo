import { describe, expect, it } from "vitest";
import { TOKEN_MAX_AGE_SECONDS } from "./constants";
import { createAppSessionJwt, verifyAppSessionJwt } from "./session";

describe("sso app session jwt", () => {
	it("creates and verifies an app session jwt", () => {
		const token = createAppSessionJwt({
			now: 100,
			secret: "session-secret",
			userInfo: { accountUid: "123", displayName: "Ada" },
		});

		expect(
			verifyAppSessionJwt({
				now: 101,
				secret: "session-secret",
				token,
			}),
		).toEqual({
			exp: 100 + TOKEN_MAX_AGE_SECONDS,
			iat: 100,
			userInfo: { accountUid: "123", displayName: "Ada" },
		});
	});

	it("rejects tokens signed with another secret", () => {
		const token = createAppSessionJwt({
			now: 100,
			secret: "session-secret",
			userInfo: { accountUid: "123" },
		});

		expect(
			verifyAppSessionJwt({
				now: 101,
				secret: "other-secret",
				token,
			}),
		).toBeNull();
	});

	it("rejects expired tokens", () => {
		const token = createAppSessionJwt({
			now: 100,
			secret: "session-secret",
			userInfo: { accountUid: "123" },
		});

		expect(
			verifyAppSessionJwt({
				now: 100 + TOKEN_MAX_AGE_SECONDS,
				secret: "session-secret",
				token,
			}),
		).toBeNull();
	});

	it("requires a session secret", () => {
		expect(() =>
			createAppSessionJwt({
				secret: "",
				userInfo: {},
			}),
		).toThrow("SSO_SESSION_SECRET is not configured");
	});
});
