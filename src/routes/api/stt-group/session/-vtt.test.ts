import { describe, expect, it, vi } from "vitest";
import { getAgoraServerConfig } from "#/lib/stt-group/server/env";
import { Route } from "./vtt";

vi.mock("#/lib/stt-group/server/env", () => ({
	getAgoraServerConfig: vi.fn(),
}));

describe("GET /api/stt-group/session/vtt", () => {
	it("returns an actionable error when caption storage is disabled", async () => {
		vi.mocked(getAgoraServerConfig).mockReturnValue({
			appId: "app-id",
			appCertificate: "app-cert",
			usesDynamicToken: true,
			sttRestAuthKey: "app-id",
			sttRestAuthSecret: "app-cert",
			sttRestBaseUrl: "https://stt.example.com/root",
			sttKeywords: [],
			sttForceTranslateIntervalSeconds: 2,
			subBotUid: "1000",
			pubBotUid: "2000",
			maxIdleTimeSeconds: 300,
		});

		const request = new Request(
			"http://localhost/api/stt-group/session/vtt?channelName=room-a&sessionId=session-1&type=source",
		);

		const response = await Route.options.server.handlers.GET({
			request,
		} as never);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data).toEqual({
			code: 1,
			msg: "VTT 下载未启用，请配置对象存储参数",
		});
	});
});
