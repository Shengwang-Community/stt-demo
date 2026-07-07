import { describe, expect, it } from "vitest";
import {
	projectAppendHistoryEntries,
	projectSubtitleCurrentLine,
	projectSubtitleHistoryLines,
	reduceSubtitleMessage,
} from "./subtitles";

describe("reduceSubtitleMessage", () => {
	it("ignores transcribe messages in aligned mode", () => {
		const lines = reduceSubtitleMessage(
			[],
			{
				uid: "speaker-a",
				dataType: "transcribe",
				culture: "zh-CN",
				words: [{ text: "原文先到", startMs: 1000, isFinal: false }],
				trans: [],
			},
			1,
			"aligned",
		);

		expect(lines).toEqual([]);
	});

	it("creates and updates paired lines directly from translate in aligned mode", () => {
		const created = reduceSubtitleMessage(
			[],
			{
				uid: "speaker-a",
				dataType: "translate",
				culture: "zh-CN",
				words: [],
				sentenceId: "sent-1",
				textTs: 1000,
				originalTranscript: {
					culture: "zh-CN",
					words: [{ text: "你好", startMs: 1000, isFinal: true }],
				},
				trans: [{ lang: "en-US", texts: ["Hello"], isFinal: true }],
				payloadFormat: "pb",
			},
			2,
			"aligned",
		);

		expect(created).toEqual([
			expect.objectContaining({
				id: "sentence:sent-1",
				sourceText: "你好",
				targetTexts: { "en-US": "Hello" },
				isFinal: true,
			}),
		]);

		const updated = reduceSubtitleMessage(
			created,
			{
				uid: "speaker-a",
				dataType: "translate",
				culture: "zh-CN",
				words: [],
				sentenceId: "sent-1",
				textTs: 1001,
				originalTranscript: {
					culture: "zh-CN",
					words: [{ text: "你好啊", startMs: 1000, isFinal: true }],
				},
				trans: [
					{ lang: "en-US", texts: ["Hello there"], isFinal: true },
					{ lang: "ja-JP", texts: ["こんにちは"], isFinal: true },
				],
				payloadFormat: "pb",
			},
			3,
			"aligned",
		);

		expect(updated).toHaveLength(1);
		expect(updated[0]).toMatchObject({
			id: "sentence:sent-1",
			sourceText: "你好啊",
			targetTexts: {
				"en-US": "Hello there",
				"ja-JP": "こんにちは",
			},
			isFinal: true,
		});
		expect(updated[0]?.sourceFragments).toEqual([
			{
				fragmentKey: "speaker-a:1000",
				text: "你好啊",
				isFinal: true,
			},
		]);
	});

	it("keeps mixed prefix and tail fragments in aligned mode", () => {
		const lines = reduceSubtitleMessage(
			[],
			{
				uid: "speaker-a",
				dataType: "translate",
				culture: "zh-CN",
				words: [],
				sentenceId: "sent-2",
				textTs: 2000,
				originalTranscript: {
					culture: "zh-CN",
					words: [
						{ text: "15岁那年", startMs: 1000, isFinal: true },
						{ text: "这里流动的印泥", startMs: 2000, isFinal: false },
					],
				},
				trans: [
					{ lang: "en-US", texts: ["At fifteen"], isFinal: true },
					{ lang: "en-US", texts: ["Here flows"], isFinal: false },
				],
				payloadFormat: "pb",
			},
			2,
			"aligned",
		);

		expect(lines).toEqual([
			expect.objectContaining({
				id: "sentence:sent-2",
				sourceText: "15岁那年这里流动的印泥",
				targetTexts: { "en-US": "At fifteenHere flows" },
				isFinal: false,
			}),
		]);
		expect(lines[0]?.sourceFragments).toEqual([
			{
				fragmentKey: "speaker-a:1000",
				text: "15岁那年",
				isFinal: true,
			},
			{
				fragmentKey: "speaker-a:2000",
				text: "这里流动的印泥",
				isFinal: false,
			},
		]);
		expect(lines[0]?.targetTextFragments?.["en-US"]).toEqual([
			{
				fragmentKey: "speaker-a:1000",
				text: "At fifteen",
				isFinal: true,
			},
			{
				fragmentKey: "speaker-a:2000",
				text: "Here flows",
				isFinal: false,
			},
		]);
	});

	it("projects stable aligned history when another line becomes current", () => {
		const currentMixed = reduceSubtitleMessage(
			[],
			{
				uid: "speaker-a",
				dataType: "translate",
				culture: "zh-CN",
				words: [],
				sentenceId: "sent-2",
				textTs: 2000,
				originalTranscript: {
					culture: "zh-CN",
					words: [
						{ text: "15岁那年", startMs: 1000, isFinal: true },
						{ text: "这里流动的印泥", startMs: 2000, isFinal: false },
					],
				},
				trans: [
					{ lang: "en-US", texts: ["At fifteen"], isFinal: true },
					{ lang: "en-US", texts: ["Here flows"], isFinal: false },
				],
			},
			2,
			"aligned",
		);

		expect(currentMixed).toHaveLength(1);
		expect(currentMixed[0]?.sourceText).toBe("15岁那年这里流动的印泥");

		const nextSentence = reduceSubtitleMessage(
			currentMixed,
			{
				uid: "speaker-a",
				dataType: "translate",
				culture: "zh-CN",
				words: [],
				sentenceId: "sent-3",
				textTs: 3000,
				originalTranscript: {
					culture: "zh-CN",
					words: [{ text: "下一句", startMs: 3000, isFinal: false }],
				},
				trans: [{ lang: "en-US", texts: ["Next line"], isFinal: false }],
			},
			3,
			"aligned",
		);

		expect(nextSentence).toHaveLength(2);
		expect(projectSubtitleCurrentLine(nextSentence, "aligned")).toMatchObject({
			id: "sentence:sent-3",
			sourceText: "下一句",
			targetTexts: { "en-US": "Next line" },
			isFinal: false,
		});
		expect(projectSubtitleHistoryLines(nextSentence, "aligned")).toEqual([
			expect.objectContaining({
				id: "sentence:sent-2",
				sourceText: "15岁那年",
				targetTexts: { "en-US": "At fifteen" },
				isFinal: true,
			}),
		]);
	});

	it("moves a same-speaker non-final aligned sentence into history when the next sentence arrives", () => {
		const sentence11 = reduceSubtitleMessage(
			[],
			{
				uid: "speaker-a",
				dataType: "translate",
				culture: "zh-CN",
				words: [],
				sentenceId: "11",
				textTs: 1100,
				originalTranscript: {
					culture: "zh-CN",
					words: [{ text: "上一句还没定稿", startMs: 1100, isFinal: false }],
				},
				trans: [{ lang: "en-US", texts: ["Previous draft"], isFinal: false }],
				payloadFormat: "pb",
			},
			1,
			"aligned",
		);

		const sentence12 = reduceSubtitleMessage(
			sentence11,
			{
				uid: "speaker-a",
				dataType: "translate",
				culture: "zh-CN",
				words: [],
				sentenceId: "12",
				textTs: 1200,
				originalTranscript: {
					culture: "zh-CN",
					words: [{ text: "下一句正在说", startMs: 1200, isFinal: false }],
				},
				trans: [{ lang: "en-US", texts: ["Next draft"], isFinal: false }],
				payloadFormat: "pb",
			},
			2,
			"aligned",
		);

		expect(projectSubtitleCurrentLine(sentence12, "aligned")).toMatchObject({
			id: "sentence:12",
			sourceText: "下一句正在说",
		});
		expect(projectSubtitleHistoryLines(sentence12, "aligned")).toEqual([
			expect.objectContaining({
				id: "sentence:11",
				sourceText: "上一句还没定稿",
				targetTexts: { "en-US": "Previous draft" },
				isFinal: false,
				sourceFragments: [
					{
						fragmentKey: "speaker-a:1100",
						text: "上一句还没定稿",
						isFinal: false,
					},
				],
			}),
		]);
	});

	it("keeps multiple aligned speakers active without dropping non-final lines", () => {
		const speakerOne = reduceSubtitleMessage(
			[],
			{
				uid: "speaker-1",
				dataType: "translate",
				culture: "zh-CN",
				words: [],
				sentenceId: "speaker-1-sent-1",
				textTs: 1000,
				originalTranscript: {
					culture: "zh-CN",
					words: [{ text: "第一位还在说", startMs: 1000, isFinal: false }],
				},
				trans: [{ lang: "en-US", texts: ["First speaker"], isFinal: false }],
				payloadFormat: "pb",
			},
			1,
			"aligned",
		);

		const withSpeakerTwo = reduceSubtitleMessage(
			speakerOne,
			{
				uid: "speaker-2",
				dataType: "translate",
				culture: "zh-CN",
				words: [],
				sentenceId: "speaker-2-sent-1",
				textTs: 2000,
				originalTranscript: {
					culture: "zh-CN",
					words: [{ text: "第二位插话", startMs: 2000, isFinal: false }],
				},
				trans: [{ lang: "en-US", texts: ["Second speaker"], isFinal: false }],
				payloadFormat: "pb",
			},
			2,
			"aligned",
		);

		expect(withSpeakerTwo).toHaveLength(2);
		expect(withSpeakerTwo).toEqual([
			expect.objectContaining({
				id: "sentence:speaker-1-sent-1",
				speakerUid: "speaker-1",
				sourceText: "第一位还在说",
				isFinal: false,
			}),
			expect.objectContaining({
				id: "sentence:speaker-2-sent-1",
				speakerUid: "speaker-2",
				sourceText: "第二位插话",
				isFinal: false,
			}),
		]);
		expect(projectSubtitleCurrentLine(withSpeakerTwo, "aligned")).toMatchObject(
			{
				id: "sentence:speaker-2-sent-1",
			},
		);
		expect(projectSubtitleHistoryLines(withSpeakerTwo, "aligned")).toEqual([]);

		const speakerOneFinal = reduceSubtitleMessage(
			withSpeakerTwo,
			{
				uid: "speaker-1",
				dataType: "translate",
				culture: "zh-CN",
				words: [],
				sentenceId: "speaker-1-sent-1",
				textTs: 1001,
				originalTranscript: {
					culture: "zh-CN",
					words: [{ text: "第一位说完了", startMs: 1000, isFinal: true }],
				},
				trans: [
					{ lang: "en-US", texts: ["First speaker done"], isFinal: true },
				],
				payloadFormat: "pb",
			},
			3,
			"aligned",
		);

		expect(speakerOneFinal).toHaveLength(2);
		expect(speakerOneFinal[1]).toMatchObject({
			id: "sentence:speaker-2-sent-1",
			isFinal: false,
		});
		expect(projectSubtitleHistoryLines(speakerOneFinal, "aligned")).toEqual([
			expect.objectContaining({
				id: "sentence:speaker-1-sent-1",
				sourceText: "第一位说完了",
				targetTexts: { "en-US": "First speaker done" },
				isFinal: true,
			}),
		]);
	});

	it("projects aligned history translation at least as complete as the stable translation shown on stage", () => {
		const currentMixed = reduceSubtitleMessage(
			[],
			{
				uid: "speaker-a",
				dataType: "translate",
				culture: "zh-CN",
				words: [],
				sentenceId: "sent-2",
				textTs: 2000,
				originalTranscript: {
					culture: "zh-CN",
					words: [
						{ text: "我是 18 岁的", startMs: 1000, isFinal: true },
						{ text: "男孩", startMs: 2000, isFinal: false },
					],
				},
				trans: [
					{ lang: "en-US", texts: ["I'm 18"], isFinal: true },
					{ lang: "en-US", texts: [" year old boy"], isFinal: false },
				],
				payloadFormat: "pb",
			},
			2,
			"aligned",
		);

		const nextSentence = reduceSubtitleMessage(
			currentMixed,
			{
				uid: "speaker-a",
				dataType: "translate",
				culture: "zh-CN",
				words: [],
				sentenceId: "sent-3",
				textTs: 3000,
				originalTranscript: {
					culture: "zh-CN",
					words: [{ text: "下一句", startMs: 3000, isFinal: false }],
				},
				trans: [{ lang: "en-US", texts: ["Next line"], isFinal: false }],
				payloadFormat: "pb",
			},
			3,
			"aligned",
		);

		expect(
			projectSubtitleHistoryLines(nextSentence, "aligned")[0],
		).toMatchObject({
			id: "sentence:sent-2",
			sourceText: "我是 18 岁的",
			targetTexts: { "en-US": "I'm 18" },
			isFinal: true,
		});
	});

	it("merges partial and final transcripts by sentence id", () => {
		const partial = reduceSubtitleMessage(
			[],
			{
				uid: "speaker-a",
				dataType: "transcribe",
				sentenceId: "42",
				culture: "zh-CN",
				words: [{ text: "你", isFinal: false }],
				trans: [],
			},
			1,
		);

		const final = reduceSubtitleMessage(
			partial,
			{
				uid: "speaker-a",
				time: 100,
				dataType: "transcribe",
				sentenceId: "42",
				culture: "zh-CN",
				words: [
					{ text: "你好", isFinal: true },
					{ text: "世界", isFinal: true },
				],
				trans: [],
			},
			2,
		);

		expect(final).toHaveLength(1);
		expect(final[0]).toMatchObject({
			id: "sentence:42",
			sourceText: "你好世界",
			isFinal: true,
			startedAt: 100,
		});
	});

	it("adds translation to the matching subtitle line without storing history elsewhere", () => {
		const transcribed = reduceSubtitleMessage(
			[],
			{
				uid: "speaker-a",
				dataType: "transcribe",
				sentenceId: "42",
				culture: "zh-CN",
				words: [{ text: "你好", isFinal: true }],
				trans: [],
			},
			1,
		);

		const translated = reduceSubtitleMessage(
			transcribed,
			{
				uid: "speaker-a",
				dataType: "translate",
				sentenceId: "42",
				words: [],
				originalTranscript: {
					culture: "zh-CN",
					words: [{ text: "你好", isFinal: true }],
				},
				trans: [{ lang: "en-US", texts: ["Hello"], isFinal: true }],
			},
			2,
		);

		expect(translated).toHaveLength(1);
		expect(translated[0]).toMatchObject({
			sourceText: "你好",
			targetTexts: { "en-US": "Hello" },
			isFinal: true,
		});

		const withJapanese = reduceSubtitleMessage(
			translated,
			{
				uid: "speaker-a",
				dataType: "translate",
				sentenceId: "42",
				words: [],
				originalTranscript: {
					culture: "zh-CN",
					words: [{ text: "你好", isFinal: true }],
				},
				trans: [{ lang: "ja-JP", texts: ["こんにちは"], isFinal: true }],
			},
			3,
		);

		expect(withJapanese[0]?.targetTexts).toEqual({
			"en-US": "Hello",
			"ja-JP": "こんにちは",
		});
	});

	it("moves a same-speaker non-final append sentence into history when the next sentence arrives", () => {
		const sentence11 = reduceSubtitleMessage(
			[],
			{
				uid: "speaker-a",
				dataType: "transcribe",
				sentenceId: "11",
				culture: "zh-CN",
				words: [{ text: "上一句还没定稿", isFinal: false }],
				trans: [],
			},
			1,
			"append",
		);

		const sentence12 = reduceSubtitleMessage(
			sentence11,
			{
				uid: "speaker-a",
				dataType: "transcribe",
				sentenceId: "12",
				culture: "zh-CN",
				words: [{ text: "下一句正在说", isFinal: false }],
				trans: [],
			},
			2,
			"append",
		);

		expect(projectSubtitleCurrentLine(sentence12, "append")).toMatchObject({
			id: "sentence:12",
			sourceText: "下一句正在说",
		});
		expect(projectAppendHistoryEntries(sentence12, "source", "en-US")).toEqual([
			expect.objectContaining({
				id: "sentence:11",
				sourceText: "上一句还没定稿",
				sourceFragments: [
					{
						fragmentKey: "sentence:11",
						text: "上一句还没定稿",
						isFinal: false,
					},
				],
			}),
		]);
	});

	it("keeps final append history normal while the pushed previous sentence stays shallow", () => {
		const sentence10 = reduceSubtitleMessage(
			[],
			{
				uid: "speaker-a",
				dataType: "transcribe",
				sentenceId: "10",
				culture: "zh-CN",
				words: [{ text: "已经完成的一句", isFinal: true }],
				trans: [],
			},
			1,
			"append",
		);
		const sentence11 = reduceSubtitleMessage(
			sentence10,
			{
				uid: "speaker-a",
				dataType: "transcribe",
				sentenceId: "11",
				culture: "zh-CN",
				words: [{ text: "未完成的上一句", isFinal: false }],
				trans: [],
			},
			2,
			"append",
		);
		const sentence12 = reduceSubtitleMessage(
			sentence11,
			{
				uid: "speaker-a",
				dataType: "transcribe",
				sentenceId: "12",
				culture: "zh-CN",
				words: [{ text: "当前新句", isFinal: false }],
				trans: [],
			},
			3,
			"append",
		);

		expect(projectSubtitleCurrentLine(sentence12, "append")).toMatchObject({
			id: "sentence:12",
			sourceText: "当前新句",
		});
		expect(projectAppendHistoryEntries(sentence12, "source", "en-US")).toEqual([
			expect.objectContaining({
				id: "sentence:10",
				sourceText: "已经完成的一句",
				sourceFragments: [
					{
						fragmentKey: "sentence:10",
						text: "已经完成的一句",
						isFinal: true,
					},
				],
			}),
			expect.objectContaining({
				id: "sentence:11",
				sourceText: "未完成的上一句",
				sourceFragments: [
					{
						fragmentKey: "sentence:11",
						text: "未完成的上一句",
						isFinal: false,
					},
				],
			}),
		]);
	});

	it("replaces a provisional tail fragment with a later full final result", () => {
		const mixed = reduceSubtitleMessage(
			[],
			{
				uid: "speaker-a",
				dataType: "transcribe",
				culture: "zh-CN",
				words: [
					{ text: "15岁那年", startMs: 1000, isFinal: true },
					{ text: "这里流动的印泥", startMs: 2000 },
				],
				trans: [],
			},
			1,
		);

		expect(mixed).toHaveLength(2);
		expect(mixed[0]).toMatchObject({
			sourceText: "15岁那年",
			isFinal: true,
		});
		expect(mixed[1]).toMatchObject({
			sourceText: "15岁那年这里流动的印泥",
			isFinal: false,
			currentTailFragmentKey: "speaker-a:2000",
		});

		const replaced = reduceSubtitleMessage(
			mixed,
			{
				uid: "speaker-a",
				dataType: "transcribe",
				culture: "zh-CN",
				words: [
					{ text: "这里流动的印泥，温暖十分", startMs: 2000, isFinal: true },
				],
				trans: [],
			},
			2,
		);

		expect(replaced).toHaveLength(2);
		expect(replaced[0]?.sourceText).toBe("15岁那年");
		expect(replaced[1]).toMatchObject({
			sourceText: "这里流动的印泥，温暖十分",
			isFinal: true,
		});
	});

	it("removes provisional translation text when the later full final fragment arrives", () => {
		const mixedSource = reduceSubtitleMessage(
			[],
			{
				uid: "speaker-a",
				dataType: "transcribe",
				culture: "zh-CN",
				words: [
					{ text: "15岁那年", startMs: 1000, isFinal: true },
					{ text: "这里流动的印泥", startMs: 2000 },
				],
				trans: [],
			},
			1,
		);

		const mixed = reduceSubtitleMessage(
			mixedSource,
			{
				uid: "speaker-a",
				dataType: "translate",
				words: [],
				originalTranscript: {
					culture: "zh-CN",
					words: [
						{ text: "15岁那年", startMs: 1000, isFinal: true },
						{ text: "这里流动的印泥", startMs: 2000 },
					],
				},
				trans: [
					{ lang: "en-US", texts: ["At fifteen"], isFinal: true },
					{ lang: "en-US", texts: ["Here flows"] },
				],
			},
			2,
		);

		expect(mixed[1]?.targetTexts["en-US"]).toBe("At fifteenHere flows");

		const replacedSource = reduceSubtitleMessage(
			mixed,
			{
				uid: "speaker-a",
				dataType: "transcribe",
				culture: "zh-CN",
				words: [
					{ text: "这里流动的印泥，温暖十分", startMs: 2000, isFinal: true },
				],
				trans: [],
			},
			3,
		);

		expect(replacedSource[1]?.targetTexts["en-US"]).toBe("Here flows");

		const replaced = reduceSubtitleMessage(
			replacedSource,
			{
				uid: "speaker-a",
				dataType: "translate",
				words: [],
				originalTranscript: {
					culture: "zh-CN",
					words: [
						{ text: "这里流动的印泥，温暖十分", startMs: 2000, isFinal: true },
					],
				},
				trans: [
					{
						lang: "en-US",
						texts: ["Here flows the warm red clay"],
						isFinal: true,
					},
				],
			},
			4,
		);

		expect(replaced[1]?.targetTexts["en-US"]).toBe(
			"Here flows the warm red clay",
		);
	});

	it("drops stable-prefix translation when a mixed current line continues as a tail-only current line", () => {
		const mixedSource = reduceSubtitleMessage(
			[],
			{
				uid: "speaker-a",
				dataType: "transcribe",
				culture: "zh-CN",
				words: [
					{ text: "A", startMs: 1000, isFinal: true },
					{ text: "B", startMs: 2000 },
				],
				trans: [],
			},
			1,
		);

		const mixed = reduceSubtitleMessage(
			mixedSource,
			{
				uid: "speaker-a",
				dataType: "translate",
				words: [],
				originalTranscript: {
					culture: "zh-CN",
					words: [
						{ text: "A", startMs: 1000, isFinal: true },
						{ text: "B", startMs: 2000 },
					],
				},
				trans: [
					{ lang: "en-US", texts: ["A-en"], isFinal: true },
					{ lang: "en-US", texts: ["B-en"] },
				],
			},
			2,
		);

		const continued = reduceSubtitleMessage(
			mixed,
			{
				uid: "speaker-a",
				dataType: "transcribe",
				culture: "zh-CN",
				sentenceId: "next-1",
				words: [{ text: "B后续", startMs: 2000 }],
				trans: [],
			},
			3,
		);

		expect(continued[1]).toMatchObject({
			id: "speaker-a:2000",
			sourceText: "B后续",
			targetTexts: { "en-US": "B-en" },
		});
	});

	it("keeps append history from showing non-final translation fragments before the final correction arrives", () => {
		const lines = [
			{
				id: "speaker-a:1000",
				speakerUid: "speaker-a",
				sentenceId: "sent-1",
				sourceText: "我是 18 岁的男孩",
				targetTexts: { "en-US": "I'm 18 year old boy" },
				isFinal: true,
				updatedAt: 1,
				sourceFragments: [
					{
						fragmentKey: "speaker-a:1000",
						text: "我是 18 岁的",
						isFinal: true,
					},
					{ fragmentKey: "speaker-a:2000", text: "男孩", isFinal: false },
				],
				targetTextFragments: {
					"en-US": [
						{
							fragmentKey: "speaker-a:1000",
							text: "I'm 18",
							isFinal: true,
						},
						{
							fragmentKey: "speaker-a:2000",
							text: " year old boy",
							isFinal: false,
						},
					],
				},
				targetVersionTextTs: { "en-US": 1000 },
			},
			{
				id: "speaker-a:3000",
				speakerUid: "speaker-a",
				sentenceId: "sent-2",
				sourceText: "下一句",
				targetTexts: { "en-US": "Next line" },
				isFinal: false,
				updatedAt: 2,
			},
		];

		expect(projectSubtitleHistoryLines(lines, "append")).toEqual([
			expect.objectContaining({
				id: "speaker-a:1000",
				targetTexts: { "en-US": "I'm 18" },
			}),
		]);
	});

	it("projects bilingual append history with source first and final target later", () => {
		const lines = [
			{
				id: "speaker-a:1000",
				speakerUid: "speaker-a",
				sentenceId: "sent-1",
				sourceText: "我是 18 岁的男孩",
				targetTexts: { "en-US": "I'm 18 year old boy" },
				isFinal: true,
				updatedAt: 1,
				sourceFragments: [
					{
						fragmentKey: "speaker-a:1000",
						text: "我是 18 岁的",
						isFinal: true,
					},
					{ fragmentKey: "speaker-a:2000", text: "男孩", isFinal: false },
				],
				targetTextFragments: {
					"en-US": [
						{
							fragmentKey: "speaker-a:1000",
							text: "I'm 18",
							isFinal: true,
						},
						{
							fragmentKey: "speaker-a:2000",
							text: " year old boy",
							isFinal: false,
						},
					],
				},
			},
			{
				id: "speaker-a:3000",
				speakerUid: "speaker-a",
				sentenceId: "sent-2",
				sourceText: "下一句",
				targetTexts: { "en-US": "Next line" },
				isFinal: false,
				updatedAt: 2,
			},
		];

		expect(projectAppendHistoryEntries(lines, "both", "en-US")).toEqual([
			expect.objectContaining({
				id: "speaker-a:1000",
				sourceText: "我是 18 岁的",
				targetTexts: { "en-US": "I'm 18" },
			}),
		]);
	});

	it("keeps target-only append history hidden until the active target language is final", () => {
		const lines = [
			{
				id: "speaker-a:1000",
				speakerUid: "speaker-a",
				sentenceId: "sent-1",
				sourceText: "你好世界",
				targetTexts: {
					"en-US": "Hello world",
					"ja-JP": "こんにちは世界",
				},
				isFinal: true,
				updatedAt: 1,
				sourceFragments: [
					{ fragmentKey: "speaker-a:1000", text: "你好世界", isFinal: true },
				],
				targetTextFragments: {
					"en-US": [
						{
							fragmentKey: "speaker-a:1000",
							text: "Hello world",
							isFinal: true,
						},
					],
					"ja-JP": [
						{
							fragmentKey: "speaker-a:1000",
							text: "こんにちは",
							isFinal: false,
						},
					],
				},
			},
			{
				id: "speaker-a:2000",
				speakerUid: "speaker-a",
				sentenceId: "sent-2",
				sourceText: "下一句",
				targetTexts: { "ja-JP": "次の文" },
				isFinal: false,
				updatedAt: 2,
			},
		];

		expect(projectAppendHistoryEntries(lines, "target", "ja-JP")).toEqual([]);
		expect(projectAppendHistoryEntries(lines, "target", "en-US")).toEqual([
			expect.objectContaining({
				id: "speaker-a:1000",
				sourceText: undefined,
				targetTexts: { "en-US": "Hello world" },
			}),
		]);
	});

	it("moves the mixed prefix into history when the next transcribe continues the tail", () => {
		const mixed = reduceSubtitleMessage(
			[],
			{
				uid: "speaker-a",
				dataType: "transcribe",
				culture: "zh-CN",
				words: [
					{ text: "A", startMs: 1000, isFinal: true },
					{ text: "B", startMs: 2000 },
				],
				trans: [],
			},
			1,
		);

		const continued = reduceSubtitleMessage(
			mixed,
			{
				uid: "speaker-a",
				dataType: "transcribe",
				culture: "zh-CN",
				sentenceId: "next-1",
				words: [{ text: "B后续", startMs: 2000 }],
				trans: [],
			},
			2,
		);

		expect(continued).toHaveLength(2);
		expect(continued[0]).toMatchObject({
			id: "speaker-a:1000",
			sourceText: "A",
			isFinal: true,
		});
		expect(continued[1]).toMatchObject({
			sourceText: "B后续",
			isFinal: false,
			currentTailFragmentKey: "speaker-a:2000",
		});
	});

	it("updates the continued tail by fragment key when single translate arrives later", () => {
		const mixed = reduceSubtitleMessage(
			[],
			{
				uid: "speaker-a",
				dataType: "transcribe",
				culture: "zh-CN",
				words: [
					{ text: "A", startMs: 1000, isFinal: true },
					{ text: "B", startMs: 2000 },
				],
				trans: [],
			},
			1,
		);

		const continued = reduceSubtitleMessage(
			mixed,
			{
				uid: "speaker-a",
				dataType: "transcribe",
				culture: "zh-CN",
				sentenceId: "next-1",
				words: [{ text: "B后续", startMs: 2000 }],
				trans: [],
			},
			2,
		);

		const translated = reduceSubtitleMessage(
			continued,
			{
				uid: "speaker-a",
				dataType: "translate",
				sentenceId: "next-1",
				textTs: 3000,
				words: [],
				originalTranscript: {
					culture: "zh-CN",
					words: [{ text: "B后续", startMs: 2000, isFinal: true }],
				},
				trans: [{ lang: "en-US", texts: ["Tail translation"], isFinal: true }],
			},
			3,
		);

		expect(translated).toHaveLength(2);
		expect(translated[1]).toMatchObject({
			id: "speaker-a:2000",
			sourceText: "B后续",
			targetTexts: { "en-US": "Tail translation" },
		});
	});

	it("keeps existing translation while the same fragment receives a newer transcribe update", () => {
		const translated = reduceSubtitleMessage(
			[],
			{
				uid: "speaker-a",
				dataType: "translate",
				sentenceId: "next-1",
				textTs: 3000,
				words: [],
				originalTranscript: {
					culture: "zh-CN",
					words: [{ text: "B后续", startMs: 2000, isFinal: true }],
				},
				trans: [{ lang: "en-US", texts: ["Tail translation"], isFinal: false }],
			},
			1,
		);

		const updated = reduceSubtitleMessage(
			translated,
			{
				uid: "speaker-a",
				dataType: "transcribe",
				culture: "zh-CN",
				sentenceId: "next-1",
				words: [{ text: "B后续扩展", startMs: 2000 }],
				trans: [],
			},
			2,
		);

		expect(updated).toHaveLength(1);
		expect(updated[0]).toMatchObject({
			id: "speaker-a:2000",
			sourceText: "B后续扩展",
			targetTexts: { "en-US": "Tail translation" },
		});
	});

	it("does not create aligned lines when translate payload misses source or target text", () => {
		const withoutSource = reduceSubtitleMessage(
			[],
			{
				uid: "speaker-a",
				dataType: "translate",
				culture: "zh-CN",
				words: [],
				textTs: 2000,
				trans: [{ lang: "en-US", texts: ["Hello"], isFinal: true }],
			},
			1,
			"aligned",
		);

		const withoutTarget = reduceSubtitleMessage(
			[],
			{
				uid: "speaker-a",
				dataType: "translate",
				culture: "zh-CN",
				words: [],
				textTs: 2001,
				originalTranscript: {
					culture: "zh-CN",
					words: [{ text: "你好", startMs: 1000, isFinal: true }],
				},
				trans: [],
			},
			2,
			"aligned",
		);

		expect(withoutSource).toEqual([]);
		expect(withoutTarget).toEqual([]);
	});
});
