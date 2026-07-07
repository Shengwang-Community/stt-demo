import { afterEach, describe, expect, it, vi } from "vitest";
import type { MobileViewerTokenPayload } from "../mobile-viewer";
import {
	createMobileViewerLink,
	createMobileViewerSession,
	verifyMobileViewerToken,
} from "./mobile-viewer";
import { getSttSessionStatus } from "./stt-rest";
import { createRtcToken } from "./tokens";

vi.mock("./stt-rest", () => ({
	getSttSessionStatus: vi.fn(),
}));

vi.mock("./tokens", () => ({
	createRtcToken: vi.fn(),
}));

const mockedGetSttSessionStatus = vi.mocked(getSttSessionStatus);
const mockedCreateRtcToken = vi.mocked(createRtcToken);

describe("mobile viewer server helpers", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
		mockedGetSttSessionStatus.mockReset();
		mockedCreateRtcToken.mockReset();
	});

	it("creates a signed viewer link and verifies its payload", async () => {
		vi.stubEnv("MOBILE_VIEWER_TOKEN_SECRET", "viewer-secret");
		vi.stubEnv("MOBILE_VIEWER_TOKEN_MAX_AGE_SECONDS", "600");
		mockedGetSttSessionStatus.mockResolvedValue({ status: "RUNNING" });

		const response = await createMobileViewerLink({
			requestOrigin: "https://demo.example.com",
			channelName: "stt-room-1",
			sessionId: "session-1",
			agentId: "agent-1",
			pubBotUid: "2000",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US"],
			subtitleRenderMode: "aligned",
			now: 100,
		});

		expect(response.viewerUrl).toContain("/mobile?viewerToken=");
		const token = response.viewerUrl.split("viewerToken=")[1] ?? "";
		const payload = verifyMobileViewerToken({
			token,
			secret: "viewer-secret",
			now: 101,
		});

		expect(payload).toEqual({
			channelName: "stt-room-1",
			sessionId: "session-1",
			agentId: "agent-1",
			pubBotUid: "2000",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US"],
			subtitleRenderMode: "aligned",
			exp: 700,
			iat: 100,
		} satisfies MobileViewerTokenPayload);
	});

	it("keeps uploaded logo data URLs out of the signed QR link", async () => {
		vi.stubEnv("MOBILE_VIEWER_TOKEN_SECRET", "viewer-secret");
		vi.stubEnv("MOBILE_VIEWER_TOKEN_MAX_AGE_SECONDS", "600");
		mockedGetSttSessionStatus.mockResolvedValue({ status: "RUNNING" });

		const response = await createMobileViewerLink({
			requestOrigin: "https://demo.example.com",
			channelName: "stt-room-1",
			sessionId: "session-1",
			agentId: "agent-1",
			pubBotUid: "2000",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US"],
			subtitleRenderMode: "aligned",
			brandName: "声网实时转录翻译",
			brandLogoUrl: `data:image/png;base64,${"a".repeat(12_000)}`,
			now: 100,
		});

		expect(response.viewerUrl.length).toBeLessThan(1200);
		const payload = verifyMobileViewerToken({
			token: response.viewerToken,
			secret: "viewer-secret",
			now: 101,
		});

		expect(payload).toMatchObject({
			brandName: "声网实时转录翻译",
			brandLogoUrl: null,
		} satisfies Partial<MobileViewerTokenPayload>);
	});

	it("rejects tampered and expired viewer tokens", async () => {
		vi.stubEnv("MOBILE_VIEWER_TOKEN_SECRET", "viewer-secret");
		vi.stubEnv("MOBILE_VIEWER_TOKEN_MAX_AGE_SECONDS", "60");
		mockedGetSttSessionStatus.mockResolvedValue({ status: "RUNNING" });

		const response = await createMobileViewerLink({
			requestOrigin: "https://demo.example.com",
			channelName: "stt-room-1",
			sessionId: "session-1",
			agentId: "agent-1",
			pubBotUid: "2000",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US"],
			subtitleRenderMode: "aligned",
			now: 100,
		});

		const token = response.viewerToken;
		expect(
			verifyMobileViewerToken({
				token: `${token.slice(0, -1)}x`,
				secret: "viewer-secret",
				now: 101,
			}),
		).toBeNull();
		expect(
			verifyMobileViewerToken({
				token,
				secret: "viewer-secret",
				now: 160,
			}),
		).toBeNull();
	});

	it("creates viewer RTC session data for an active STT agent", async () => {
		vi.stubEnv("MOBILE_VIEWER_TOKEN_SECRET", "viewer-secret");
		vi.stubEnv("MOBILE_VIEWER_TOKEN_MAX_AGE_SECONDS", "600");
		mockedGetSttSessionStatus.mockResolvedValue({ status: "RUNNING" });
		mockedCreateRtcToken.mockReturnValue({
			appId: "app-id",
			token: "rtc-token",
			uid: "100321",
		});

		const link = await createMobileViewerLink({
			requestOrigin: "https://demo.example.com",
			channelName: "stt-room-1",
			sessionId: "session-1",
			agentId: "agent-1",
			pubBotUid: "2000",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US", "ja-JP"],
			subtitleRenderMode: "aligned",
			now: 100,
		});

		const session = await createMobileViewerSession({
			viewerToken: link.viewerToken,
			now: 101,
		});

		expect(session).toEqual({
			appId: "app-id",
			channelName: "stt-room-1",
			uid: "100321",
			token: "rtc-token",
			pubBotUid: "2000",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US", "ja-JP"],
			subtitleRenderMode: "aligned",
			sessionId: "session-1",
			expiresAt: 700000,
		});
		expect(mockedCreateRtcToken).toHaveBeenCalledWith({
			channelName: "stt-room-1",
			uid: expect.stringMatching(/^\d+$/),
		});
	});

	it("rejects viewer session creation when the STT agent is inactive", async () => {
		vi.stubEnv("MOBILE_VIEWER_TOKEN_SECRET", "viewer-secret");
		vi.stubEnv("MOBILE_VIEWER_TOKEN_MAX_AGE_SECONDS", "600");
		mockedGetSttSessionStatus
			.mockResolvedValueOnce({ status: "RUNNING" })
			.mockResolvedValueOnce({ status: "STOPPED" });

		const link = await createMobileViewerLink({
			requestOrigin: "https://demo.example.com",
			channelName: "stt-room-1",
			sessionId: "session-1",
			agentId: "agent-1",
			pubBotUid: "2000",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US"],
			subtitleRenderMode: "aligned",
			now: 100,
		});

		await expect(
			createMobileViewerSession({
				viewerToken: link.viewerToken,
				now: 101,
			}),
		).rejects.toThrow("房间字幕已结束");
	});
});
