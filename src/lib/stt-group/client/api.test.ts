import { afterEach, describe, expect, it, vi } from "vitest";
import {
	type ApiError,
	requestMobileViewerLink,
	requestMobileViewerSession,
} from "./api";

describe("stt-group client api", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("posts mobile viewer link requests to the expected endpoint", async () => {
		const fetchMock = vi.fn(async () =>
			Response.json({
				viewerToken: "viewer-token",
				viewerUrl: "https://demo.example.com/mobile?viewerToken=viewer-token",
				expiresAt: 123,
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		const response = await requestMobileViewerLink({
			channelName: "stt-room-1",
			sessionId: "session-1",
			agentId: "agent-1",
			pubBotUid: "2000",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US"],
			subtitleRenderMode: "aligned",
		});

		expect(response.viewerToken).toBe("viewer-token");
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/mobile-viewer/link",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({
					channelName: "stt-room-1",
					sessionId: "session-1",
					agentId: "agent-1",
					pubBotUid: "2000",
					sourceLanguages: ["zh-CN"],
					targetLanguages: ["en-US"],
					subtitleRenderMode: "aligned",
				}),
			}),
		);
	});

	it("posts mobile viewer session requests to the expected endpoint", async () => {
		const fetchMock = vi.fn(async () =>
			Response.json({
				appId: "app-id",
				channelName: "stt-room-1",
				uid: "100001",
				token: "rtc-token",
				pubBotUid: "2000",
				sourceLanguages: ["zh-CN"],
				targetLanguages: ["en-US"],
				subtitleRenderMode: "aligned",
				sessionId: "session-1",
				expiresAt: 123,
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		const response = await requestMobileViewerSession({
			viewerToken: "viewer-token",
		});

		expect(response.uid).toBe("100001");
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/mobile-viewer/session",
			expect.objectContaining({
				method: "POST",
			}),
		);
	});

	it("preserves errorCode from failed API responses", async () => {
		const fetchMock = vi.fn(async () =>
			Response.json(
				{
					code: 1,
					errorCode: "viewer_link_invalid",
					msg: "链接无效或已过期",
				},
				{ status: 400 },
			),
		);
		vi.stubGlobal("fetch", fetchMock);

		await expect(
			requestMobileViewerSession({
				viewerToken: "viewer-token",
			}),
		).rejects.toMatchObject({
			message: "链接无效或已过期",
			errorCode: "viewer_link_invalid",
		} satisfies Partial<ApiError>);
	});

	it("throws a stable API error when a failed response is not JSON", async () => {
		const fetchMock = vi.fn(
			async () =>
				new Response("<!doctype html>Unauthorized", {
					status: 401,
					headers: { "Content-Type": "text/html" },
				}),
		);
		vi.stubGlobal("fetch", fetchMock);

		await expect(
			requestMobileViewerLink({
				channelName: "stt-room-1",
				sessionId: "session-1",
				agentId: "agent-1",
				pubBotUid: "2000",
				sourceLanguages: ["zh-CN"],
				targetLanguages: ["en-US"],
				subtitleRenderMode: "aligned",
			}),
		).rejects.toMatchObject({
			message: "Request failed: /api/mobile-viewer/link",
		} satisfies Partial<ApiError>);
	});
});
