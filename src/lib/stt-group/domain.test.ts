import { describe, expect, it } from "vitest";
import {
	buildStartedRoomMetadata,
	createDefaultChannelName,
	emptyRoomAdmissionMetadata,
	isValidChannelName,
	parseRoomAdmissionMetadata,
	parseRoomMetadata,
} from "./domain";

describe("createDefaultChannelName", () => {
	it("creates a valid short random Agora channel name", () => {
		const first = createDefaultChannelName();
		const second = createDefaultChannelName();

		expect(first).toMatch(/^[A-Z0-9]{6}$/);
		expect(second).toMatch(/^[A-Z0-9]{6}$/);
		expect(first).not.toBe(second);
		expect(isValidChannelName(first)).toBe(true);
	});

	it("rejects invalid Agora RTM channel symbols before calling the SDK", () => {
		expect(isValidChannelName("stt-room-1")).toBe(true);
		expect(isValidChannelName("__stt_room__")).toBe(false);
		expect(isValidChannelName("stt room")).toBe(false);
	});

	it("preserves participant slots when STT metadata transitions to started", () => {
		expect(
			buildStartedRoomMetadata({
				appId: "app-id",
				sessionId: "session-1",
				agentId: "agent-1",
				status: "STARTED",
				controllerUserId: "user-1",
				recognitionMode: "single",
				sourceLanguages: ["zh-CN"],
				targetLanguages: ["en-US"],
				subBotUid: "1000",
				pubBotUid: "2000",
				startedAt: 1_717_000_000_000,
			}),
		).toMatchObject({
			status: "start",
			controllerUserId: "user-1",
			experienceLimitRemoved: false,
		});
	});

	it("parses close reason from room metadata", () => {
		expect(
			parseRoomMetadata(
				JSON.stringify({
					status: "end",
					closeReason: "expired",
					experienceLimitRemoved: true,
				}),
			),
		).toMatchObject({
			status: "end",
			closeReason: "expired",
			experienceLimitRemoved: true,
		});
	});

	it("parses admission metadata independently from room state", () => {
		expect(
			parseRoomAdmissionMetadata(
				JSON.stringify({ participantUserIds: ["user-1", "user-2"] }),
			),
		).toEqual({
			participantUserIds: ["user-1", "user-2"],
		});
		expect(parseRoomAdmissionMetadata("")).toEqual(
			emptyRoomAdmissionMetadata(),
		);
	});
});
