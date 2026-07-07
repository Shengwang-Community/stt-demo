import protobuf from "protobufjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeSttTextMessage } from "./stt-message-decoder";
import { installSubtitleDebugConsoleApi } from "./subtitle-debug";

const proto = `
syntax = "proto3";
package Agora.SpeechToText;
message Text {
  reserved 1 to 3, 5, 7 to 9, 11, 17;
  int64 uid = 4;
  int64 time = 6;
  repeated Word words = 10;
  int32 duration_ms = 12;
  string data_type = 13;
  repeated Translation trans = 14;
  string culture = 15;
  int64 text_ts = 16;
  OriginalTranscript original_transcript = 18;
  int64 sentence_id = 19;
}
message Word {
  string text = 1;
  int32 start_ms = 2;
  int32 duration_ms = 3;
  bool is_final = 4;
  double confidence = 5;
}
message Translation {
  bool is_final = 1;
  string lang = 2;
  repeated string texts = 3;
}
message OriginalTranscript {
  string culture = 1;
  repeated Word words = 2;
}
`;

const TextMessage = protobuf
	.parse(proto)
	.root.lookupType("Agora.SpeechToText.Text");

describe("decodeSttTextMessage", () => {
	afterEach(() => {
		delete (globalThis as typeof globalThis & {
			__STT_DEMO_SUBTITLE_DEBUG__?: unknown;
		}).__STT_DEMO_SUBTITLE_DEBUG__;
		vi.restoreAllMocks();
	});

	it("decodes transcribe messages", () => {
		const payload = TextMessage.encode({
			uid: 123,
			dataType: "transcribe",
			culture: "zh-CN",
			sentenceId: 99,
			words: [{ text: "你好", isFinal: true }],
		}).finish();

		expect(decodeSttTextMessage(payload)).toMatchObject({
			uid: "123",
			dataType: "transcribe",
			culture: "zh-CN",
			payloadFormat: "pb",
			sentenceId: "99",
			words: [{ text: "你好", isFinal: true }],
		});
	});

	it("decodes translate messages", () => {
		const payload = TextMessage.encode({
			uid: 123,
			dataType: "translate",
			sentenceId: 99,
			originalTranscript: {
				culture: "zh-CN",
				words: [{ text: "你好", isFinal: true }],
			},
			trans: [{ lang: "en-US", texts: ["Hello"], isFinal: true }],
		}).finish();

		expect(decodeSttTextMessage(payload)).toMatchObject({
			uid: "123",
			dataType: "translate",
			sentenceId: "99",
			originalTranscript: {
				culture: "zh-CN",
				words: [{ text: "你好", isFinal: true }],
			},
			trans: [{ lang: "en-US", texts: ["Hello"], isFinal: true }],
		});
	});

	it("preserves startMs and durationMs on decoded words", () => {
		const payload = TextMessage.encode({
			uid: 123,
			dataType: "translate",
			sentenceId: 100,
			words: [
				{ text: "前句", startMs: 1000, durationMs: 400, isFinal: true },
				{ text: "后句", startMs: 1600, durationMs: 500 },
			],
			originalTranscript: {
				culture: "zh-CN",
				words: [
					{ text: "前句", startMs: 1000, durationMs: 400, isFinal: true },
					{ text: "后句", startMs: 1600, durationMs: 500 },
				],
			},
			trans: [{ lang: "en-US", texts: ["First", "Second"] }],
		}).finish();

		expect(decodeSttTextMessage(payload)).toMatchObject({
			uid: "123",
			sentenceId: "100",
			words: [
				{ text: "前句", startMs: 1000, durationMs: 400, isFinal: true },
				{ text: "后句", startMs: 1600, durationMs: 500, isFinal: false },
			],
			originalTranscript: {
				words: [
					{ text: "前句", startMs: 1000, durationMs: 400, isFinal: true },
					{ text: "后句", startMs: 1600, durationMs: 500, isFinal: false },
				],
			},
		});
	});

	it("prints the raw pb payload only when console debug logging is enabled", () => {
		const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
		const payload = TextMessage.encode({
			uid: 123,
			dataType: "transcribe",
			culture: "zh-CN",
			words: [{ text: "你好", isFinal: true }],
		}).finish();

		decodeSttTextMessage(payload);
		expect(infoSpy).not.toHaveBeenCalled();

		installSubtitleDebugConsoleApi().enableRawSubtitleLogging();
		decodeSttTextMessage(payload);

		expect(infoSpy).toHaveBeenCalledWith(
			"[subtitle-debug] decoded pb payload transcribe",
			expect.objectContaining({
				uid: "123",
				dataType: "transcribe",
				culture: "zh-CN",
			}),
		);
	});
});
