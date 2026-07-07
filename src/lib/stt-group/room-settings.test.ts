import { describe, expect, it } from "vitest";
import {
	buildRoomSettings,
	DEFAULT_EXPERIENCE_SECONDS,
	getParticipantLimitReachedMessage,
	getRemainingSeconds,
	isParticipantLimitExceeded,
	isParticipantLimitReached,
	MAX_GROUP_PARTICIPANTS,
	normalizeNickname,
} from "./room-settings";

describe("room settings", () => {
	it("normalizes nickname and falls back to a default label", () => {
		expect(normalizeNickname("  Alice  ", "fallback")).toBe("Alice");
		expect(normalizeNickname("", "fallback")).toBe("fallback");
	});

	it("builds multi-source and multi-target settings", () => {
		expect(
			buildRoomSettings({
				channelName: "room-1001",
				nickname: "Alice",
				fallbackNickname: "SSO User",
				recognitionMode: "multi",
				sourceLanguages: ["zh-CN", "en-US"],
				targetLanguages: ["ja-JP", "de-DE"],
			}),
		).toEqual({
			channelName: "room-1001",
			nickname: "Alice",
			recognitionMode: "multi",
			sourceLanguages: ["zh-CN", "en-US"],
			targetLanguages: ["ja-JP", "de-DE"],
		});
	});

	it("calculates countdown from a start timestamp", () => {
		const startedAt = 1_000;
		expect(DEFAULT_EXPERIENCE_SECONDS).toBe(10 * 60);
		expect(getRemainingSeconds(startedAt, 31_000)).toBe(
			DEFAULT_EXPERIENCE_SECONDS - 30,
		);
		expect(getRemainingSeconds(startedAt, 10_000_000)).toBe(0);
	});

	it("detects the group-room participant limit", () => {
		expect(isParticipantLimitReached(MAX_GROUP_PARTICIPANTS - 1)).toBe(false);
		expect(isParticipantLimitReached(MAX_GROUP_PARTICIPANTS)).toBe(true);
		expect(isParticipantLimitExceeded(MAX_GROUP_PARTICIPANTS)).toBe(false);
		expect(isParticipantLimitExceeded(MAX_GROUP_PARTICIPANTS + 1)).toBe(true);
	});

	it("formats the group-room participant limit message", () => {
		expect(getParticipantLimitReachedMessage()).toBe(
			`频道人数已满（最多 ${MAX_GROUP_PARTICIPANTS} 人）`,
		);
	});
});
