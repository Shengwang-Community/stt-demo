import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeJsonSttMessage } from "./stt-json-message-decoder";
import { installSubtitleDebugConsoleApi } from "./subtitle-debug";

describe("decodeJsonSttMessage", () => {
	afterEach(() => {
		delete (
			globalThis as typeof globalThis & {
				__STT_DEMO_SUBTITLE_DEBUG__?: unknown;
			}
		).__STT_DEMO_SUBTITLE_DEBUG__;
		vi.restoreAllMocks();
	});

	it("decodes transcript payloads", () => {
		const payload = new TextEncoder().encode(
			JSON.stringify({
				transcript: {
					uid: 100438,
					language: "zh-CN",
					text: "他跟我开了",
					isFinal: false,
					offset: 1782717975303,
					duration: 720,
					textTs: 1782717975642,
					sentenceId: 1782717974915,
					results: [{ language: "zh-CN", text: "任意非空 gate" }],
				},
			}),
		);

		expect(decodeJsonSttMessage(payload)).toMatchObject([
			{
				uid: "100438",
				dataType: "transcribe",
				culture: "zh-CN",
				payloadFormat: "json",
				textTs: 1782717975642,
				sentenceId: "1782717974915",
				words: [
					{
						text: "任意非空 gate",
						isFinal: false,
						startMs: 1782717975303,
						durationMs: 720,
					},
				],
			},
		]);
	});

	it("splits transcript result items that carry different sentence ids", () => {
		const payload = new TextEncoder().encode(
			JSON.stringify({
				transcript: {
					uid: 100438,
					language: "zh-CN",
					textTs: 1782717975642,
					results: [
						{
							language: "zh-CN",
							text: "已经完成的一句",
							isFinal: true,
							offset: 1000,
							sentenceId: 10,
						},
						{
							language: "zh-CN",
							text: "未完成的上一句",
							isFinal: false,
							offset: 2000,
							sentenceId: 11,
						},
					],
				},
			}),
		);

		expect(decodeJsonSttMessage(payload)).toMatchObject([
			{
				uid: "100438",
				dataType: "transcribe",
				sentenceId: "10",
				words: [
					{
						text: "已经完成的一句",
						isFinal: true,
						startMs: 1000,
					},
				],
			},
			{
				uid: "100438",
				dataType: "transcribe",
				sentenceId: "11",
				words: [
					{
						text: "未完成的上一句",
						isFinal: false,
						startMs: 2000,
					},
				],
			},
		]);
	});

	it("decodes translation payloads", () => {
		const payload = new TextEncoder().encode(
			JSON.stringify({
				translation: {
					uid: 100438,
					isFinal: true,
					offset: 1782717972123,
					duration: 960,
					textTs: 1782717972774,
					sentenceId: 1782717972425,
					original_transcript: {
						language: "zh-CN",
						text: "这边。",
						results: [
							{
								language: "zh-CN",
								text: "这边。",
								isFinal: true,
								offset: 1782717972123,
								duration: 960,
							},
						],
					},
					results: [{ language: "en-US", texts: ["Here."] }],
				},
			}),
		);

		expect(decodeJsonSttMessage(payload)).toMatchObject([
			{
				uid: "100438",
				dataType: "translate",
				culture: "zh-CN",
				payloadFormat: "json",
				textTs: 1782717972774,
				sentenceId: "1782717972425",
				trans: [{ lang: "en-US", texts: ["Here."], isFinal: true }],
				originalTranscript: {
					culture: "zh-CN",
					words: [
						{
							text: "这边。",
							isFinal: true,
							startMs: 1782717972123,
							durationMs: 960,
						},
					],
				},
				alignedOriginalTranscript: {
					words: [
						{
							text: "这边。",
							isFinal: true,
							startMs: 1782717972123,
							durationMs: 960,
						},
					],
				},
			},
		]);
	});

	it("splits translation original transcript results that carry different sentence ids", () => {
		const payload = new TextEncoder().encode(
			JSON.stringify({
				translation: {
					uid: 100438,
					isFinal: false,
					textTs: 1782717972774,
					original_transcript: {
						language: "zh-CN",
						results: [
							{
								language: "zh-CN",
								text: "已经完成的一句",
								isFinal: true,
								offset: 1000,
								sentenceId: 10,
							},
							{
								language: "zh-CN",
								text: "未完成的上一句",
								isFinal: false,
								offset: 2000,
								sentenceId: 11,
							},
						],
					},
					results: [
						{
							language: "en-US",
							texts: ["Completed line"],
							isFinal: true,
						},
						{
							language: "en-US",
							texts: ["Previous draft"],
							isFinal: false,
						},
					],
				},
			}),
		);

		expect(decodeJsonSttMessage(payload)).toMatchObject([
			{
				uid: "100438",
				dataType: "translate",
				sentenceId: "10",
				originalTranscript: {
					words: [
						{
							text: "已经完成的一句",
							isFinal: true,
							startMs: 1000,
						},
					],
				},
				trans: [{ lang: "en-US", texts: ["Completed line"], isFinal: true }],
			},
			{
				uid: "100438",
				dataType: "translate",
				sentenceId: "11",
				originalTranscript: {
					words: [
						{
							text: "未完成的上一句",
							isFinal: false,
							startMs: 2000,
						},
					],
				},
				trans: [{ lang: "en-US", texts: ["Previous draft"], isFinal: false }],
			},
		]);
	});

	it("prefers original transcript fragment results for json translation payloads", () => {
		const payload = new TextEncoder().encode(
			JSON.stringify({
				translation: {
					uid: 174734,
					isFinal: true,
					offset: 1782821218251,
					duration: 12960,
					textTs: 1782821235120,
					sentenceId: 1782821218260,
					original_transcript: {
						language: "zh-CN",
						text: "这段整句 text 不该作为 aligned 正文主来源",
						results: [
							{
								text: "朗读原文：在19世纪的俄罗斯文坛中，契诃夫堪称短篇小说艺术大师。",
								isFinal: true,
								offset: 1782821218251,
							},
							{
								text: "安东·巴甫洛维奇·契诃夫出生于贫民家庭，靠",
								isFinal: false,
								offset: 1782821229000,
							},
						],
					},
					results: [
						{
							language: "en-US",
							texts: [
								"Read the original text: In 19th-century Russian literature...",
							],
							isFinal: true,
						},
						{
							language: "en-US",
							texts: [
								"Anton Pavlovich Chekhov was born into a poor family, relying on",
							],
							isFinal: false,
						},
					],
				},
			}),
		);

		expect(decodeJsonSttMessage(payload)).toMatchObject([
			{
				uid: "174734",
				dataType: "translate",
				sentenceId: "1782821218260",
				trans: [
					{
						lang: "en-US",
						texts: [
							"Read the original text: In 19th-century Russian literature...",
						],
						isFinal: true,
					},
					{
						lang: "en-US",
						texts: [
							"Anton Pavlovich Chekhov was born into a poor family, relying on",
						],
						isFinal: false,
					},
				],
				originalTranscript: {
					culture: "zh-CN",
					words: [
						{
							text: "朗读原文：在19世纪的俄罗斯文坛中，契诃夫堪称短篇小说艺术大师。",
							isFinal: true,
							startMs: 1782821218251,
							durationMs: 12960,
						},
						{
							text: "安东·巴甫洛维奇·契诃夫出生于贫民家庭，靠",
							isFinal: false,
							startMs: 1782821229000,
							durationMs: 12960,
						},
					],
				},
				alignedOriginalTranscript: {
					words: [
						{
							text: "朗读原文：在19世纪的俄罗斯文坛中，契诃夫堪称短篇小说艺术大师。",
							isFinal: true,
							startMs: 1782821218251,
						},
						{
							text: "安东·巴甫洛维奇·契诃夫出生于贫民家庭，靠",
							isFinal: false,
							startMs: 1782821229000,
						},
					],
				},
			},
		]);
	});

	it("keeps mixed final and non-final source fragments for append-compatible translation payloads", () => {
		const payload = new TextEncoder().encode(
			JSON.stringify({
				translation: {
					uid: 174734,
					isFinal: false,
					offset: 1782821218251,
					duration: 12960,
					textTs: 1782821235120,
					sentenceId: 1782821218260,
					original_transcript: {
						language: "zh-CN",
						text: "整句 text 仅作为 fallback",
						results: [
							{
								text: "我是 18 岁的",
								isFinal: true,
								offset: 1782821218251,
								duration: 960,
							},
							{
								text: "男孩",
								isFinal: false,
								offset: 1782821229000,
								duration: 480,
							},
						],
					},
					results: [
						{
							language: "en-US",
							texts: ["I'm 18"],
							isFinal: true,
						},
						{
							language: "en-US",
							texts: [" year old boy"],
							isFinal: false,
						},
					],
				},
			}),
		);

		expect(decodeJsonSttMessage(payload)).toMatchObject([
			{
				dataType: "translate",
				payloadFormat: "json",
				originalTranscript: {
					words: [
						{
							text: "我是 18 岁的",
							isFinal: true,
							startMs: 1782821218251,
							durationMs: 960,
						},
						{
							text: "男孩",
							isFinal: false,
							startMs: 1782821229000,
							durationMs: 480,
						},
					],
				},
				alignedOriginalTranscript: {
					words: [
						{
							text: "我是 18 岁的",
							isFinal: true,
							startMs: 1782821218251,
							durationMs: 960,
						},
						{
							text: "男孩",
							isFinal: false,
							startMs: 1782821229000,
							durationMs: 480,
						},
					],
				},
				trans: [
					{
						lang: "en-US",
						texts: ["I'm 18"],
						isFinal: true,
					},
					{
						lang: "en-US",
						texts: [" year old boy"],
						isFinal: false,
					},
				],
			},
		]);
	});

	it("ignores transcript payloads when results is empty even if whole-sentence text exists", () => {
		const payload = new TextEncoder().encode(
			JSON.stringify({
				transcript: {
					uid: 100438,
					language: "zh-CN",
					text: "他跟我开了",
					results: [],
				},
			}),
		);

		expect(decodeJsonSttMessage(payload)).toEqual([]);
	});

	it("ignores translation payloads when only numbered results fields are present", () => {
		const payload = new TextEncoder().encode(
			JSON.stringify({
				translation: {
					uid: 170746,
					isFinal: false,
					offset: 1782819174514,
					duration: 17460,
					textTs: 1782819192261,
					sentenceId: 1782819174193,
					results0: {
						language: "en-US",
						texts: ["This should be ignored."],
					},
					results: [],
					original_transcript: {
						language: "zh-CN",
						text: "这段 original_transcript.text 会因为 results 为空而整体忽略",
						results: [],
					},
				},
			}),
		);

		expect(decodeJsonSttMessage(payload)).toEqual([]);
	});

	it("prints the raw json payload only when console debug logging is enabled", () => {
		const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
		const payload = new TextEncoder().encode(
			JSON.stringify({
				transcript: {
					uid: 100438,
					language: "zh-CN",
					text: "他跟我开了",
					results: [{ language: "zh-CN", text: "任意非空 gate" }],
				},
			}),
		);

		decodeJsonSttMessage(payload);
		expect(infoSpy).not.toHaveBeenCalled();

		installSubtitleDebugConsoleApi().enableRawSubtitleLogging();
		decodeJsonSttMessage(payload);

		expect(infoSpy).toHaveBeenCalledWith(
			"[subtitle-debug] decoded json payload transcribe",
			expect.objectContaining({
				transcript: expect.objectContaining({
					uid: 100438,
					language: "zh-CN",
					text: "他跟我开了",
					results: [{ language: "zh-CN", text: "任意非空 gate" }],
				}),
			}),
		);
	});

	it("prints translate-specific raw json payload labels", () => {
		const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
		const payload = new TextEncoder().encode(
			JSON.stringify({
				translation: {
					uid: 100438,
					results: [{ language: "en-US", texts: ["Here."] }],
					original_transcript: {
						language: "zh-CN",
						results: [{ text: "这边。" }],
					},
				},
			}),
		);

		installSubtitleDebugConsoleApi().enableRawSubtitleLogging();
		decodeJsonSttMessage(payload);

		expect(infoSpy).toHaveBeenCalledWith(
			"[subtitle-debug] decoded json payload translate",
			expect.objectContaining({
				translation: expect.objectContaining({
					uid: 100438,
				}),
			}),
		);
	});
});
