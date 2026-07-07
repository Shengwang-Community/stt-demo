import AgoraAccessToken from "agora-access-token";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRtcToken, createRtmToken } from "./tokens";

const env = {
	VITE_AGORA_RTC_APP_ID: "app-id",
	AGORA_RTC_APP_CERTIFICATE: "app-cert",
	VITE_AGORA_RTM_APP_ID: "app-id",
	AGORA_RTM_APP_CERTIFICATE: "app-cert",
};

describe("createRtcToken", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
	});

	it("builds RTC tokens with numeric UID so STT speaker IDs match members", () => {
		for (const [key, value] of Object.entries(env)) {
			vi.stubEnv(key, value);
		}
		const spy = vi
			.spyOn(AgoraAccessToken.RtcTokenBuilder, "buildTokenWithUid")
			.mockReturnValue("rtc-token");

		expect(createRtcToken({ channelName: "room-a", uid: "10020" })).toEqual({
			appId: "app-id",
			token: "rtc-token",
			uid: "10020",
		});
		expect(spy).toHaveBeenCalledWith(
			"app-id",
			"app-cert",
			"room-a",
			10020,
			AgoraAccessToken.RtcRole.PUBLISHER,
			expect.any(Number),
		);
	});

	it("rejects non-numeric RTC UID strings", () => {
		for (const [key, value] of Object.entries(env)) {
			vi.stubEnv(key, value);
		}

		expect(() =>
			createRtcToken({ channelName: "room-a", uid: "user-a" }),
		).toThrow("RTC uid must be a numeric string");
	});

	it("uses an override app id when provided", () => {
		for (const [key, value] of Object.entries(env)) {
			vi.stubEnv(key, value);
		}
		const spy = vi
			.spyOn(AgoraAccessToken.RtcTokenBuilder, "buildTokenWithUid")
			.mockReturnValue("rtc-token");

		expect(
			createRtcToken({
				channelName: "room-a",
				uid: "10020",
				config: {
					appId: "customappid",
					appCertificate: "app-cert",
					usesDynamicToken: true,
				},
			}),
		).toEqual({
			appId: "customappid",
			token: "rtc-token",
			uid: "10020",
		});
		expect(spy).toHaveBeenCalledWith(
			"customappid",
			"app-cert",
			"room-a",
			10020,
			AgoraAccessToken.RtcRole.PUBLISHER,
			expect.any(Number),
		);
	});

	it("returns null RTC and RTM tokens for static key apps", () => {
		for (const [key, value] of Object.entries({
			...env,
			AGORA_RTC_APP_CERTIFICATE: "",
			AGORA_RTM_APP_CERTIFICATE: "",
		})) {
			vi.stubEnv(key, value);
		}

		expect(createRtcToken({ channelName: "room-a", uid: "10020" })).toEqual({
			appId: "app-id",
			token: null,
			uid: "10020",
		});
		expect(createRtmToken({ userId: "10020" })).toEqual({
			appId: "app-id",
			token: null,
			userId: "10020",
		});
	});

	it("uses RTM-specific app credentials when configured", () => {
		for (const [key, value] of Object.entries({
			...env,
			VITE_AGORA_RTM_APP_ID: "rtm-app-id",
			AGORA_RTM_APP_CERTIFICATE: "rtm-app-cert",
		})) {
			vi.stubEnv(key, value);
		}
		const rtcSpy = vi
			.spyOn(AgoraAccessToken.RtcTokenBuilder, "buildTokenWithUid")
			.mockReturnValue("rtc-token");
		const rtmSpy = vi
			.spyOn(AgoraAccessToken.RtmTokenBuilder, "buildToken")
			.mockReturnValue("rtm-token");

		expect(createRtcToken({ channelName: "room-a", uid: "10020" })).toEqual({
			appId: "app-id",
			token: "rtc-token",
			uid: "10020",
		});
		expect(createRtmToken({ userId: "10020" })).toEqual({
			appId: "rtm-app-id",
			token: "rtm-token",
			userId: "10020",
		});
		expect(rtcSpy).toHaveBeenCalledWith(
			"app-id",
			"app-cert",
			"room-a",
			10020,
			AgoraAccessToken.RtcRole.PUBLISHER,
			expect.any(Number),
		);
		expect(rtmSpy).toHaveBeenCalledWith(
			"rtm-app-id",
			"rtm-app-cert",
			"10020",
			AgoraAccessToken.RtmRole.Rtm_User,
			expect.any(Number),
		);
	});
});
