import { describe, expect, it } from "vitest";
import {
	buildCaptionFileNamePrefix,
	buildCaptionFileNamePrefixList,
	buildCaptionPrefixSegments,
	buildCaptionObjectKey,
	mapCaptionProviderToShengwangVendor,
} from "./caption-storage";

describe("caption storage helpers", () => {
	it("maps provider to Shengwang vendor codes", () => {
		expect(mapCaptionProviderToShengwangVendor("aws")).toBe(1);
		expect(mapCaptionProviderToShengwangVendor("aliyun")).toBe(2);
	});

	it("builds a stable caption file prefix", () => {
		expect(
			buildCaptionFileNamePrefix({
				prefixRoot: "stt-demo/captions",
				channelName: "room-a",
				sessionId: "session-1",
			}),
		).toBe("sttdemo/captions/rooma/session1");
	});

	it("builds the expected VTT object keys", () => {
		expect(
			buildCaptionObjectKey({
				fileNamePrefix: "sttdemo/captions/rooma/session1",
				type: "source",
			}),
		).toBe("sttdemo/captions/rooma/session1/source.vtt");
		expect(
			buildCaptionObjectKey({
				fileNamePrefix: "sttdemo/captions/rooma/session1",
				type: "target",
			}),
		).toBe("sttdemo/captions/rooma/session1/target.vtt");
	});

	it("builds the expected caption fileNamePrefix list", () => {
		expect(
			buildCaptionFileNamePrefixList({
				prefixRoot: "stt-demo/captions",
				channelName: "room-a",
				sessionId: "session-1",
			}),
		).toEqual(["sttdemo", "captions", "rooma", "session1"]);
	});

	it("builds storage-safe caption prefix segments", () => {
		expect(
			buildCaptionPrefixSegments({
				prefixRoot: "stt-demo/captions",
				channelName: "room-a",
				sessionId: "session-1",
			}),
		).toEqual(["sttdemo", "captions", "rooma", "session1"]);
	});
});
