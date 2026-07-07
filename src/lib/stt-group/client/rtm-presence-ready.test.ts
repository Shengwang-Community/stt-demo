import { describe, expect, it } from "vitest";
import {
	createPresenceReadyChannelName,
	isPresenceReadinessError,
} from "./rtm-presence-ready";

describe("isPresenceReadinessError", () => {
	it("detects the RTM Presence initialization race error", () => {
		expect(
			isPresenceReadinessError(
				new Error("Error Code -13001 - Presence service not connected."),
			),
		).toBe(true);
		expect(isPresenceReadinessError({ code: -13001 })).toBe(true);
		expect(isPresenceReadinessError(new Error("PRESENCE_NOT_READY"))).toBe(
			true,
		);
	});

	it("does not hide unrelated RTM errors", () => {
		expect(isPresenceReadinessError(new Error("invalid token"))).toBe(false);
		expect(isPresenceReadinessError({ code: -10_005 })).toBe(false);
	});
});

describe("createPresenceReadyChannelName", () => {
	it("creates a deterministic temporary channel name from the user ID", () => {
		expect(
			createPresenceReadyChannelName("019acb1e-2b88-77f7-a3cb-5803a42491f8"),
		).toBe("sttpresenceready-a3cb5803a42491f8");
	});
});
