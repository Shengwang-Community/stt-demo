// @vitest-environment jsdom

import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "#/lib/i18n";
import type { SubtitleLine } from "#/lib/stt-group";
import { SubtitleStage } from "./subtitle-stage";

const lines: SubtitleLine[] = [
	{
		id: "speaker-a:1000",
		speakerUid: "speaker-a",
		sourceText: "15岁那年",
		targetTexts: { "en-US": "At fifteen" },
		isFinal: true,
		updatedAt: 1,
		sourceFragments: [
			{ fragmentKey: "speaker-a:1000", text: "15岁那年", isFinal: true },
		],
		targetTextFragments: {
			"en-US": [
				{ fragmentKey: "speaker-a:1000", text: "At fifteen", isFinal: true },
			],
		},
	},
	{
		id: "speaker-a:2000",
		speakerUid: "speaker-a",
		sourceText: "15岁那年这里流动的印泥",
		targetTexts: { "en-US": "At fifteenHere flows" },
		isFinal: false,
		updatedAt: 2,
		currentTailFragmentKey: "speaker-a:2000",
		sourceFragments: [
			{ fragmentKey: "speaker-a:1000", text: "15岁那年", isFinal: true },
			{ fragmentKey: "speaker-a:2000", text: "这里流动的印泥", isFinal: false },
		],
		targetTextFragments: {
			"en-US": [
				{ fragmentKey: "speaker-a:1000", text: "At fifteen", isFinal: true },
				{ fragmentKey: "speaker-a:2000", text: "Here flows", isFinal: false },
			],
		},
	},
];

const reducedMotionMediaQuery = "(prefers-reduced-motion: reduce)";

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

beforeEach(() => {
	vi.stubGlobal(
		"matchMedia",
		(query: string) =>
			({
				matches: false,
				media: query,
				onchange: null,
				addEventListener: () => {},
				removeEventListener: () => {},
				addListener: () => {},
				removeListener: () => {},
				dispatchEvent: () => false,
			}) as MediaQueryList,
	);
});

const getHistoryItem = (text: string) => {
	const item = screen.getByText(text).closest(".history-item");
	expect(item).toBeTruthy();
	return item;
};

const renderStage = (ui: React.ReactElement) =>
	render(<LocaleProvider initialLocale="zh-CN">{ui}</LocaleProvider>);

describe("SubtitleStage", () => {
	it("renders a finalized prefix and a gray provisional tail in current stage", () => {
		renderStage(
			<SubtitleStage
				roomJoined
				sttRunning
				sourceLanguages={["zh-CN"]}
				targetLanguages={["en-US"]}
				activeTargetLanguage="en-US"
				subtitleRenderMode="append"
				displayMode="both"
				lines={lines}
				members={[]}
				showVttExport
				onDisplayModeChange={() => {}}
				onActiveTargetLanguageChange={() => {}}
				onExportSourceVtt={() => {}}
				onExportTargetVtt={() => {}}
			/>,
		);

		expect(screen.getAllByText("15岁那年").length).toBeGreaterThan(0);
		expect(screen.getByText("这里流动的印泥")).toBeTruthy();
		expect(screen.getAllByText("At fifteen").length).toBeGreaterThan(0);
		expect(screen.getByText("Here flows")).toBeTruthy();
		expect(
			screen.getByLabelText("等待English (United States)后续翻译"),
		).toBeTruthy();
	});

	it("uses the same waiting headline in aligned mode before the first subtitle arrives", () => {
		renderStage(
			<SubtitleStage
				roomJoined
				sttRunning
				sourceLanguages={["zh-CN"]}
				targetLanguages={["en-US"]}
				activeTargetLanguage="en-US"
				subtitleRenderMode="aligned"
				displayMode="both"
				lines={[]}
				members={[]}
				showVttExport={false}
				onDisplayModeChange={() => {}}
				onActiveTargetLanguageChange={() => {}}
				onExportSourceVtt={() => {}}
				onExportTargetVtt={() => {}}
			/>,
		);

		expect(screen.getByText("实时字幕将在这里出现")).toBeTruthy();
		expect(screen.getByText("接收中")).toBeTruthy();
	});

	it("shows finalized append history even when translation lags the source", () => {
		renderStage(
			<SubtitleStage
				roomJoined
				sttRunning={false}
				sourceLanguages={["zh-CN"]}
				targetLanguages={["en-US"]}
				activeTargetLanguage="en-US"
				subtitleRenderMode="append"
				displayMode="both"
				lines={[
					{
						id: "speaker-a:2000",
						speakerUid: "speaker-a",
						sourceText: "上一句",
						targetTexts: { "en-US": "Previous line" },
						isFinal: true,
						updatedAt: 2,
						sourceVersionTextTs: 2000,
						targetVersionTextTs: { "en-US": 2000 },
					},
					{
						id: "speaker-a:3000",
						speakerUid: "speaker-a",
						sourceText: "更新后的原文",
						targetTexts: { "en-US": "Old translation" },
						isFinal: true,
						updatedAt: 3,
						sourceVersionTextTs: 4000,
						targetVersionTextTs: { "en-US": 3000 },
					},
				]}
				members={[]}
				showVttExport
				onDisplayModeChange={() => {}}
				onActiveTargetLanguageChange={() => {}}
				onExportSourceVtt={() => {}}
				onExportTargetVtt={() => {}}
			/>,
		);

		expect(screen.getByText("上一句")).toBeTruthy();
		expect(screen.getByText("Previous line")).toBeTruthy();
		expect(screen.getAllByText("更新后的原文").length).toBe(1);
		expect(screen.getAllByText("Old translation").length).toBe(1);
	});

	it("does not show append target-only history before the active target language is final", () => {
		const { container } = renderStage(
			<SubtitleStage
				roomJoined
				sttRunning
				sourceLanguages={["zh-CN"]}
				targetLanguages={["en-US"]}
				activeTargetLanguage="en-US"
				subtitleRenderMode="append"
				displayMode="target"
				lines={[
					{
						id: "speaker-a:1000",
						speakerUid: "speaker-a",
						sentenceId: "sent-1",
						sourceText: "上一句",
						targetTexts: { "en-US": "Previous line" },
						isFinal: true,
						updatedAt: 1,
						sourceFragments: [
							{ fragmentKey: "speaker-a:1000", text: "上一句", isFinal: true },
						],
						targetTextFragments: {
							"en-US": [
								{
									fragmentKey: "speaker-a:1000",
									text: "Previous line",
									isFinal: false,
								},
							],
						},
					},
					{
						id: "speaker-a:2000",
						speakerUid: "speaker-a",
						sentenceId: "sent-2",
						sourceText: "当前句",
						targetTexts: { "en-US": "Current line" },
						isFinal: false,
						updatedAt: 2,
					},
				]}
				members={[]}
				showVttExport={false}
				onDisplayModeChange={() => {}}
				onActiveTargetLanguageChange={() => {}}
				onExportSourceVtt={() => {}}
				onExportTargetVtt={() => {}}
			/>,
		);

		expect(container.querySelectorAll(".history-item")).toHaveLength(0);
		expect(screen.queryByText("Previous line")).toBeNull();
		expect(screen.getByText("Current line")).toBeTruthy();
	});

	it("keeps bilingual append history visible with source only until the final translation arrives", () => {
		const { container } = renderStage(
			<SubtitleStage
				roomJoined
				sttRunning={false}
				sourceLanguages={["zh-CN"]}
				targetLanguages={["en-US"]}
				activeTargetLanguage="en-US"
				subtitleRenderMode="append"
				displayMode="both"
				lines={[
					{
						id: "speaker-a:1000",
						speakerUid: "speaker-a",
						sentenceId: "sent-1",
						sourceText: "上一句",
						targetTexts: { "en-US": "Previous line" },
						isFinal: true,
						updatedAt: 1,
						sourceFragments: [
							{ fragmentKey: "speaker-a:1000", text: "上一句", isFinal: true },
						],
						targetTextFragments: {
							"en-US": [
								{
									fragmentKey: "speaker-a:1000",
									text: "Previous line",
									isFinal: false,
								},
							],
						},
					},
					{
						id: "speaker-a:2000",
						speakerUid: "speaker-a",
						sentenceId: "sent-2",
						sourceText: "当前句",
						targetTexts: { "en-US": "Current line" },
						isFinal: false,
						updatedAt: 2,
					},
				]}
				members={[]}
				showVttExport={false}
				onDisplayModeChange={() => {}}
				onActiveTargetLanguageChange={() => {}}
				onExportSourceVtt={() => {}}
				onExportTargetVtt={() => {}}
			/>,
		);

		expect(container.querySelectorAll(".history-item")).toHaveLength(1);
		expect(screen.getByText("上一句")).toBeTruthy();
		expect(screen.queryByText("Previous line")).toBeNull();
	});

	it("marks a newly entered history item as entering", () => {
		renderStage(
			<SubtitleStage
				roomJoined
				sttRunning
				sourceLanguages={["zh-CN"]}
				targetLanguages={["en-US"]}
				activeTargetLanguage="en-US"
				subtitleRenderMode="append"
				displayMode="both"
				lines={[
					{
						id: "speaker-a:1000",
						speakerUid: "speaker-a",
						sourceText: "上一句",
						targetTexts: { "en-US": "Previous line" },
						isFinal: true,
						updatedAt: 1,
					},
					{
						id: "speaker-a:2000",
						speakerUid: "speaker-a",
						sourceText: "当前句",
						targetTexts: { "en-US": "Current line" },
						isFinal: false,
						updatedAt: 2,
					},
				]}
				members={[]}
				showVttExport
				onDisplayModeChange={() => {}}
				onActiveTargetLanguageChange={() => {}}
				onExportSourceVtt={() => {}}
				onExportTargetVtt={() => {}}
			/>,
		);

		const historyItem = getHistoryItem("上一句");
		expect(historyItem?.className).toContain("history-item-entering");
	});

	it("removes entering state after animation end", async () => {
		renderStage(
			<SubtitleStage
				roomJoined
				sttRunning
				sourceLanguages={["zh-CN"]}
				targetLanguages={["en-US"]}
				activeTargetLanguage="en-US"
				subtitleRenderMode="append"
				displayMode="both"
				lines={[
					{
						id: "speaker-a:1000",
						speakerUid: "speaker-a",
						sourceText: "上一句",
						targetTexts: { "en-US": "Previous line" },
						isFinal: true,
						updatedAt: 1,
					},
					{
						id: "speaker-a:2000",
						speakerUid: "speaker-a",
						sourceText: "当前句",
						targetTexts: { "en-US": "Current line" },
						isFinal: false,
						updatedAt: 2,
					},
				]}
				members={[]}
				showVttExport
				onDisplayModeChange={() => {}}
				onActiveTargetLanguageChange={() => {}}
				onExportSourceVtt={() => {}}
				onExportTargetVtt={() => {}}
			/>,
		);

		const historyItem = getHistoryItem("上一句");
		expect(historyItem?.className).toContain("history-item-entering");

		fireEvent.animationEnd(historyItem);

		await waitFor(() => {
			expect(getHistoryItem("上一句")?.className).not.toContain(
				"history-item-entering",
			);
		});
	});

	it("does not retrigger entering on rerender for the same history item", async () => {
		const props = {
			roomJoined: true,
			sttRunning: true,
			sourceLanguages: ["zh-CN"] as const,
			targetLanguages: ["en-US"] as const,
			activeTargetLanguage: "en-US" as const,
			subtitleRenderMode: "append" as const,
			displayMode: "both" as const,
			members: [],
			showVttExport: true,
			onDisplayModeChange: () => {},
			onActiveTargetLanguageChange: () => {},
			onExportSourceVtt: () => {},
			onExportTargetVtt: () => {},
		};

		const { rerender } = renderStage(
			<SubtitleStage
				{...props}
				lines={[
					{
						id: "speaker-a:1000",
						speakerUid: "speaker-a",
						sourceText: "上一句",
						targetTexts: { "en-US": "Previous line" },
						isFinal: true,
						updatedAt: 1,
					},
					{
						id: "speaker-a:2000",
						speakerUid: "speaker-a",
						sourceText: "当前句",
						targetTexts: { "en-US": "Current line" },
						isFinal: false,
						updatedAt: 2,
					},
				]}
			/>,
		);

		const historyItem = getHistoryItem("上一句");
		fireEvent.animationEnd(historyItem);
		await waitFor(() => {
			expect(getHistoryItem("上一句")?.className).not.toContain(
				"history-item-entering",
			);
		});

		rerender(
			<LocaleProvider initialLocale="zh-CN">
				<SubtitleStage
					{...props}
					lines={[
						{
							id: "speaker-a:1000",
							speakerUid: "speaker-a",
							sourceText: "上一句",
							targetTexts: { "en-US": "Updated translation" },
							isFinal: true,
							updatedAt: 3,
						},
						{
							id: "speaker-a:2000",
							speakerUid: "speaker-a",
							sourceText: "当前句",
							targetTexts: { "en-US": "Current line" },
							isFinal: false,
							updatedAt: 4,
						},
					]}
				/>
			</LocaleProvider>,
		);

		expect(getHistoryItem("上一句")?.className).not.toContain(
			"history-item-entering",
		);
	});

	it("skips entering animation when reduced motion is preferred", () => {
		vi.stubGlobal(
			"matchMedia",
			(query: string) =>
				({
					matches: query === reducedMotionMediaQuery,
					media: query,
					onchange: null,
					addEventListener: () => {},
					removeEventListener: () => {},
					addListener: () => {},
					removeListener: () => {},
					dispatchEvent: () => false,
				}) as MediaQueryList,
		);

		renderStage(
			<SubtitleStage
				roomJoined
				sttRunning
				sourceLanguages={["zh-CN"]}
				targetLanguages={["en-US"]}
				activeTargetLanguage="en-US"
				subtitleRenderMode="append"
				displayMode="both"
				lines={[
					{
						id: "speaker-a:1000",
						speakerUid: "speaker-a",
						sourceText: "上一句",
						targetTexts: { "en-US": "Previous line" },
						isFinal: true,
						updatedAt: 1,
					},
					{
						id: "speaker-a:2000",
						speakerUid: "speaker-a",
						sourceText: "当前句",
						targetTexts: { "en-US": "Current line" },
						isFinal: false,
						updatedAt: 2,
					},
				]}
				members={[]}
				showVttExport
				onDisplayModeChange={() => {}}
				onActiveTargetLanguageChange={() => {}}
				onExportSourceVtt={() => {}}
				onExportTargetVtt={() => {}}
			/>,
		);

		expect(getHistoryItem("上一句")?.className).not.toContain(
			"history-item-entering",
		);
	});

	it("hides VTT export buttons when developer mode export is disabled", () => {
		renderStage(
			<SubtitleStage
				roomJoined
				sttRunning
				sourceLanguages={["zh-CN"]}
				targetLanguages={["en-US"]}
				activeTargetLanguage="en-US"
				subtitleRenderMode="append"
				displayMode="both"
				lines={lines}
				members={[]}
				showVttExport={false}
				onDisplayModeChange={() => {}}
				onActiveTargetLanguageChange={() => {}}
				onExportSourceVtt={() => {}}
				onExportTargetVtt={() => {}}
			/>,
		);

		expect(screen.queryByText("原文 VTT")).toBeNull();
		expect(screen.queryByText("译文 VTT")).toBeNull();
	});

	it("shows VTT export buttons when developer mode export is enabled", () => {
		renderStage(
			<SubtitleStage
				roomJoined
				sttRunning
				sourceLanguages={["zh-CN"]}
				targetLanguages={["en-US"]}
				activeTargetLanguage="en-US"
				displayMode="both"
				lines={lines}
				members={[]}
				showVttExport
				onDisplayModeChange={() => {}}
				onActiveTargetLanguageChange={() => {}}
				onExportSourceVtt={() => {}}
				onExportTargetVtt={() => {}}
			/>,
		);

		expect(screen.getByText("原文 VTT")).toBeTruthy();
		expect(screen.getByText("译文 VTT")).toBeTruthy();
	});

	it("switches the focused target language shown in the stage toolbar and current subtitle area", async () => {
		const onActiveTargetLanguageChange = vi.fn();

		renderStage(
			<SubtitleStage
				roomJoined
				sttRunning
				sourceLanguages={["zh-CN"]}
				targetLanguages={["en-US", "ja-JP"]}
				activeTargetLanguage="en-US"
				subtitleRenderMode="append"
				displayMode="target"
				lines={[
					{
						id: "speaker-a:1000",
						speakerUid: "speaker-a",
						sourceText: "你好",
						targetTexts: {
							"en-US": "Hello",
							"ja-JP": "こんにちは",
						},
						isFinal: false,
						updatedAt: 1,
					},
				]}
				members={[]}
				showVttExport={false}
				onDisplayModeChange={() => {}}
				onActiveTargetLanguageChange={onActiveTargetLanguageChange}
				onExportSourceVtt={() => {}}
				onExportTargetVtt={() => {}}
			/>,
		);

		expect(screen.getByText("Hello")).toBeTruthy();
		expect(screen.queryByText("こんにちは")).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "翻译为" }));
		fireEvent.click(
			screen.getByRole("option", {
				name: "中文（普通话）->日语（日本）",
			}),
		);

		expect(onActiveTargetLanguageChange).toHaveBeenCalledWith("ja-JP");
	});

	it("shows target-language choices as source-to-target pairs", () => {
		renderStage(
			<SubtitleStage
				roomJoined
				sttRunning
				sourceLanguages={["zh-CN", "en-US", "ja-JP", "de-DE"]}
				targetLanguages={["zh-CN", "en-US"]}
				activeTargetLanguage="zh-CN"
				subtitleRenderMode="append"
				displayMode="target"
				lines={lines}
				members={[]}
				showVttExport={false}
				onDisplayModeChange={() => {}}
				onActiveTargetLanguageChange={() => {}}
				onExportSourceVtt={() => {}}
				onExportTargetVtt={() => {}}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "翻译为" }));

		expect(
			screen.getByRole("option", {
				name: "中文（普通话）, 英语（美国）, 日语（日本）, 德语（德国）->中文（普通话）",
			}),
		).toBeTruthy();
		expect(
			screen.getByRole("option", {
				name: "中文（普通话）, 英语（美国）, 日语（日本）, 德语（德国）->英语（美国）",
			}),
		).toBeTruthy();
	});

	it("renders aligned mode without append-only partial and waiting markers", () => {
		renderStage(
			<SubtitleStage
				roomJoined
				sttRunning
				sourceLanguages={["zh-CN"]}
				targetLanguages={["en-US"]}
				activeTargetLanguage="en-US"
				subtitleRenderMode="aligned"
				displayMode="both"
				lines={[
					{
						id: "history:sentence:1",
						speakerUid: "speaker-a",
						sourceText: "上一句",
						targetTexts: { "en-US": "Previous line" },
						isFinal: true,
						updatedAt: 1,
						sourceFragments: [
							{ fragmentKey: "speaker-a:1000", text: "上一句", isFinal: true },
						],
						targetTextFragments: {
							"en-US": [
								{
									fragmentKey: "speaker-a:1000",
									text: "Previous line",
									isFinal: true,
								},
							],
						},
					},
					{
						id: "sentence:2",
						speakerUid: "speaker-a",
						sourceText: "当前句",
						targetTexts: { "en-US": "Current line" },
						isFinal: true,
						updatedAt: 2,
						sourceFragments: [
							{ fragmentKey: "speaker-a:2000", text: "当前句", isFinal: true },
						],
						targetTextFragments: {
							"en-US": [
								{
									fragmentKey: "speaker-a:2000",
									text: "Current line",
									isFinal: true,
								},
							],
						},
					},
				]}
				members={[]}
				showVttExport={false}
				onDisplayModeChange={() => {}}
				onActiveTargetLanguageChange={() => {}}
				onExportSourceVtt={() => {}}
				onExportTargetVtt={() => {}}
			/>,
		);

		expect(screen.getAllByText("当前句").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Current line").length).toBeGreaterThan(0);
		expect(screen.getByText("上一句")).toBeTruthy();
		expect(screen.getByText("Previous line")).toBeTruthy();
	});

	it("shows partial status and loading dots for aligned non-final subtitles", () => {
		renderStage(
			<SubtitleStage
				roomJoined
				sttRunning
				sourceLanguages={["zh-CN"]}
				targetLanguages={["en-US"]}
				activeTargetLanguage="en-US"
				subtitleRenderMode="aligned"
				displayMode="both"
				lines={[
					{
						id: "sentence:2",
						speakerUid: "speaker-a",
						sourceText: "当前句",
						targetTexts: { "en-US": "Current line" },
						isFinal: false,
						updatedAt: 2,
						currentTailFragmentKey: "speaker-a:2001",
						sourceFragments: [
							{ fragmentKey: "speaker-a:2000", text: "当前", isFinal: true },
							{ fragmentKey: "speaker-a:2001", text: "句", isFinal: false },
						],
						targetTextFragments: {
							"en-US": [
								{
									fragmentKey: "speaker-a:2000",
									text: "Current ",
									isFinal: true,
								},
								{
									fragmentKey: "speaker-a:2001",
									text: "line",
									isFinal: false,
								},
							],
						},
					},
				]}
				members={[]}
				showVttExport={false}
				onDisplayModeChange={() => {}}
				onActiveTargetLanguageChange={() => {}}
				onExportSourceVtt={() => {}}
				onExportTargetVtt={() => {}}
			/>,
		);

		expect(screen.getByLabelText("等待原文后续内容")).toBeTruthy();
		expect(
			screen.getByLabelText("等待English (United States)后续翻译"),
		).toBeTruthy();
	});

	it("uses delayed history commit in aligned mode", () => {
		renderStage(
			<SubtitleStage
				roomJoined
				sttRunning
				sourceLanguages={["zh-CN"]}
				targetLanguages={["en-US"]}
				activeTargetLanguage="en-US"
				subtitleRenderMode="aligned"
				displayMode="both"
				lines={[
					{
						id: "history:sentence:2",
						speakerUid: "speaker-a",
						sourceText: "上一句稳定前缀",
						targetTexts: { "en-US": "Previous stable prefix" },
						isFinal: true,
						updatedAt: 1,
						sourceFragments: [
							{
								fragmentKey: "speaker-a:1000",
								text: "上一句稳定前缀",
								isFinal: true,
							},
						],
						targetTextFragments: {
							"en-US": [
								{
									fragmentKey: "speaker-a:1000",
									text: "Previous stable prefix",
									isFinal: true,
								},
							],
						},
					},
					{
						id: "sentence:3",
						speakerUid: "speaker-a",
						sourceText: "当前新句",
						targetTexts: { "en-US": "Current new line" },
						isFinal: false,
						updatedAt: 2,
						currentTailFragmentKey: "speaker-a:3000",
						sourceFragments: [
							{
								fragmentKey: "speaker-a:3000",
								text: "当前新句",
								isFinal: false,
							},
						],
						targetTextFragments: {
							"en-US": [
								{
									fragmentKey: "speaker-a:3000",
									text: "Current new line",
									isFinal: false,
								},
							],
						},
					},
				]}
				members={[]}
				showVttExport={false}
				onDisplayModeChange={() => {}}
				onActiveTargetLanguageChange={() => {}}
				onExportSourceVtt={() => {}}
				onExportTargetVtt={() => {}}
			/>,
		);

		expect(screen.getByText("上一句稳定前缀")).toBeTruthy();
		expect(screen.getByText("Previous stable prefix")).toBeTruthy();
		expect(screen.getAllByText("当前新句").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Current new line").length).toBeGreaterThan(0);
	});

	it("shows finalized aligned history for one speaker while another speaker is current", () => {
		renderStage(
			<SubtitleStage
				roomJoined
				sttRunning
				sourceLanguages={["zh-CN"]}
				targetLanguages={["en-US"]}
				activeTargetLanguage="en-US"
				subtitleRenderMode="aligned"
				displayMode="both"
				lines={[
					{
						id: "sentence:speaker-1-final",
						speakerUid: "speaker-1",
						sourceText: "第一位说完了",
						targetTexts: { "en-US": "First speaker done" },
						isFinal: true,
						updatedAt: 3,
						sourceFragments: [
							{
								fragmentKey: "speaker-1:1000",
								text: "第一位说完了",
								isFinal: true,
							},
						],
						targetTextFragments: {
							"en-US": [
								{
									fragmentKey: "speaker-1:1000",
									text: "First speaker done",
									isFinal: true,
								},
							],
						},
					},
					{
						id: "sentence:speaker-2-live",
						speakerUid: "speaker-2",
						sourceText: "第二位还在说",
						targetTexts: { "en-US": "Second speaker still talking" },
						isFinal: false,
						updatedAt: 2,
						currentTailFragmentKey: "speaker-2:2000",
						sourceFragments: [
							{
								fragmentKey: "speaker-2:2000",
								text: "第二位还在说",
								isFinal: false,
							},
						],
						targetTextFragments: {
							"en-US": [
								{
									fragmentKey: "speaker-2:2000",
									text: "Second speaker still talking",
									isFinal: false,
								},
							],
						},
					},
				]}
				members={[]}
				showVttExport={false}
				onDisplayModeChange={() => {}}
				onActiveTargetLanguageChange={() => {}}
				onExportSourceVtt={() => {}}
				onExportTargetVtt={() => {}}
			/>,
		);

		expect(screen.getByText("第一位说完了")).toBeTruthy();
		expect(screen.getByText("First speaker done")).toBeTruthy();
		expect(screen.getAllByText("第二位还在说").length).toBeGreaterThan(0);
		expect(
			screen.getAllByText("Second speaker still talking").length,
		).toBeGreaterThan(0);
	});
});
