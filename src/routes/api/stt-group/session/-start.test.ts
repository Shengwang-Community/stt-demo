import { describe, expect, it, vi } from "vitest";
import { startSttSession } from "#/lib/stt-group/server/stt-rest";
import { Route } from "./start";

vi.mock("#/lib/stt-group/server/stt-rest", () => ({
	startSttSession: vi.fn(),
}));

describe("POST /api/stt-group/session/start", () => {
	it("passes sttVendor through without server-side allowlist validation", async () => {
		vi.mocked(startSttSession).mockResolvedValue({
			appId: "app-id",
			sessionId: "session-id",
			agentId: "agent-id",
			status: "RUNNING",
			controllerUserId: "controller-a",
			recognitionMode: "single",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US"],
			subBotUid: "1000",
			pubBotUid: "2000",
			startedAt: 1,
		});

		const request = new Request(
			"http://localhost/api/stt-group/session/start",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					channelName: "room-a",
					controllerUserId: "controller-a",
					controllerName: "Controller A",
					recognitionMode: "single",
					sourceLanguages: ["zh-CN"],
					targetLanguages: ["en-US"],
					sttVendor: "soniox",
				}),
			},
		);

		const response = await Route.options.server.handlers.POST({
			request,
		} as never);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.agentId).toBe("agent-id");
		expect(startSttSession).toHaveBeenCalledWith(
			expect.objectContaining({
				sttVendor: "soniox",
			}),
			expect.anything(),
		);
	});
});
