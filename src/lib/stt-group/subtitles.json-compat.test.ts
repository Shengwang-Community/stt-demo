import { describe, expect, it } from "vitest";
import { decodeJsonSttMessage } from "./client/stt-json-message-decoder";
import type { DecodedSttTextMessage, SubtitleLine } from "./domain";
import { reduceSubtitleMessage } from "./subtitles";

const reduceMessages = (
	messages: DecodedSttTextMessage[],
	subtitleRenderMode: "append" | "aligned" = "append",
) =>
	messages.reduce(
		(lines, message) =>
			reduceSubtitleMessage(lines, message, 1000, subtitleRenderMode),
		[] as SubtitleLine[],
	);

describe("subtitle json compatibility", () => {
	it("produces equivalent subtitle lines for pb and json mixed transcribe updates", () => {
		const pbMessages: DecodedSttTextMessage[] = [
			{
				uid: "2000",
				dataType: "transcribe",
				culture: "zh-CN",
				words: [
					{ text: "你好。", isFinal: true, startMs: 1000 },
					{ text: "今天", isFinal: false, startMs: 1400 },
				],
				trans: [],
				payloadFormat: "pb",
			},
		];

		const jsonMessages: DecodedSttTextMessage[] = [
			{
				uid: "2000",
				dataType: "transcribe",
				culture: "zh-CN",
				words: [
					{ text: "你好。", isFinal: true, startMs: 1000 },
					{ text: "今天", isFinal: false, startMs: 1400 },
				],
				trans: [],
				payloadFormat: "json",
			},
		];

		expect(reduceMessages(pbMessages)).toEqual(reduceMessages(jsonMessages));
	});

	it("produces equivalent append lines for pb and json mixed translate updates", () => {
		const pbMessages: DecodedSttTextMessage[] = [
			{
				uid: "2000",
				dataType: "translate",
				culture: "zh-CN",
				words: [],
				originalTranscript: {
					culture: "zh-CN",
					words: [
						{ text: "我是 18 岁的", isFinal: true, startMs: 1000 },
						{ text: "男孩", isFinal: false, startMs: 1400 },
					],
				},
				trans: [
					{ lang: "en-US", texts: ["I'm 18"], isFinal: true },
					{ lang: "en-US", texts: [" year old boy"], isFinal: false },
				],
				payloadFormat: "pb",
			},
		];

		const jsonMessages: DecodedSttTextMessage[] = [
			{
				uid: "2000",
				dataType: "translate",
				culture: "zh-CN",
				words: [],
				originalTranscript: {
					culture: "zh-CN",
					words: [
						{ text: "我是 18 岁的", isFinal: true, startMs: 1000 },
						{ text: "男孩", isFinal: false, startMs: 1400 },
					],
				},
				alignedOriginalTranscript: {
					culture: "zh-CN",
					words: [
						{ text: "我是 18 岁的", isFinal: true, startMs: 1000 },
						{ text: "男孩", isFinal: false, startMs: 1400 },
					],
				},
				trans: [
					{ lang: "en-US", texts: ["I'm 18"], isFinal: true },
					{ lang: "en-US", texts: [" year old boy"], isFinal: false },
				],
				payloadFormat: "json",
			},
		];

		expect(reduceMessages(pbMessages)).toEqual(reduceMessages(jsonMessages));
	});

	it("produces equivalent subtitle lines for pb and json translate updates", () => {
		const pbMessages: DecodedSttTextMessage[] = [
			{
				uid: "2000",
				dataType: "translate",
				culture: "zh-CN",
				words: [],
				originalTranscript: {
					culture: "zh-CN",
					words: [{ text: "你好", isFinal: true, startMs: 1000 }],
				},
				trans: [{ lang: "en-US", texts: ["Hello"], isFinal: true }],
				payloadFormat: "pb",
			},
		];

		const jsonMessages: DecodedSttTextMessage[] = [
			{
				uid: "2000",
				dataType: "translate",
				culture: "zh-CN",
				words: [],
				originalTranscript: {
					culture: "zh-CN",
					words: [{ text: "你好", isFinal: true, startMs: 1000 }],
				},
				alignedOriginalTranscript: {
					culture: "zh-CN",
					words: [{ text: "你好", isFinal: true, startMs: 1000 }],
				},
				trans: [{ lang: "en-US", texts: ["Hello"], isFinal: true }],
				payloadFormat: "json",
			},
		];

		expect(reduceMessages(pbMessages)).toEqual(reduceMessages(jsonMessages));
	});

	it("produces equivalent subtitle lines for pb and json translate updates in aligned mode", () => {
		const pbMessages: DecodedSttTextMessage[] = [
			{
				uid: "2000",
				dataType: "translate",
				culture: "zh-CN",
				sentenceId: "sentence-1",
				textTs: 1000,
				words: [],
				originalTranscript: {
					culture: "zh-CN",
					words: [{ text: "你好", isFinal: true, startMs: 1000 }],
				},
				trans: [{ lang: "en-US", texts: ["Hello"], isFinal: true }],
				payloadFormat: "pb",
			},
		];

		const jsonMessages: DecodedSttTextMessage[] = [
			{
				uid: "2000",
				dataType: "translate",
				culture: "zh-CN",
				sentenceId: "sentence-1",
				textTs: 1000,
				words: [],
				originalTranscript: {
					culture: "zh-CN",
					words: [{ text: "你好", isFinal: true, startMs: 1000 }],
				},
				alignedOriginalTranscript: {
					culture: "zh-CN",
					words: [{ text: "你好", isFinal: true, startMs: 1000 }],
				},
				trans: [{ lang: "en-US", texts: ["Hello"], isFinal: true }],
				payloadFormat: "json",
			},
		];

		expect(reduceMessages(pbMessages, "aligned")).toEqual(
			reduceMessages(jsonMessages, "aligned"),
		);
	});

	it("uses json fragment arrays for aligned mode instead of whole-sentence text", () => {
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
							{ text: "前半句", isFinal: true, offset: 1000 },
							{ text: "后半句", isFinal: false, offset: 2000 },
						],
					},
					results: [
						{
							language: "en-US",
							texts: ["First half"],
							isFinal: true,
						},
						{
							language: "en-US",
							texts: ["Second half"],
							isFinal: false,
						},
					],
				},
			}),
		);

		const messages = decodeJsonSttMessage(payload);
		const lines = reduceMessages(messages, "aligned");

		expect(lines).toHaveLength(1);
		expect(lines[0]).toMatchObject({
			id: "sentence:1782821218260",
			sourceText: "前半句后半句",
			targetTexts: { "en-US": "First halfSecond half" },
			isFinal: false,
			sourceFragments: [
				{ fragmentKey: "174734:1000", text: "前半句", isFinal: true },
				{ fragmentKey: "174734:2000", text: "后半句", isFinal: false },
			],
			targetTextFragments: {
				"en-US": [
					{ fragmentKey: "174734:1000", text: "First half", isFinal: true },
					{ fragmentKey: "174734:2000", text: "Second half", isFinal: false },
				],
			},
		});
	});
});
