import { afterEach, describe, expect, it, vi } from "vitest";
import {
	installSubtitleDebugConsoleApi,
	isRawSubtitleLoggingEnabled,
	logSubtitleDebug,
	syncRawSubtitleLogging,
} from "./subtitle-debug";

describe("subtitle debug console api", () => {
	afterEach(() => {
		delete (globalThis as typeof globalThis & {
			__STT_DEMO_SUBTITLE_DEBUG__?: unknown;
		}).__STT_DEMO_SUBTITLE_DEBUG__;
		vi.restoreAllMocks();
	});

	it("installs a reusable console api and keeps logging disabled by default", () => {
		const api = installSubtitleDebugConsoleApi();

		expect(api.help).toContain("enableRawSubtitleLogging");
		expect(api.getState()).toEqual({ rawSubtitleLoggingEnabled: false });
		expect(isRawSubtitleLoggingEnabled()).toBe(false);
		expect(installSubtitleDebugConsoleApi()).toBe(api);
	});

	it("logs only after the console api enables raw subtitle logging", () => {
		const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
		const api = installSubtitleDebugConsoleApi();

		logSubtitleDebug("decoded pb payload", { uid: "1000" });
		expect(infoSpy).not.toHaveBeenCalled();

		api.enableRawSubtitleLogging();
		logSubtitleDebug("decoded pb payload", { uid: "1000" });

		expect(infoSpy).toHaveBeenCalledWith(
			"[subtitle-debug] decoded pb payload",
			{ uid: "1000" },
		);

		api.disableRawSubtitleLogging();
		logSubtitleDebug("decoded pb payload", { uid: "1000" });
		expect(infoSpy).toHaveBeenCalledTimes(1);
	});

	it("can sync raw subtitle logging state from developer mode", () => {
		installSubtitleDebugConsoleApi();

		expect(syncRawSubtitleLogging(true)).toBe(true);
		expect(isRawSubtitleLoggingEnabled()).toBe(true);

		expect(syncRawSubtitleLogging(false)).toBe(false);
		expect(isRawSubtitleLoggingEnabled()).toBe(false);
	});
});
