// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "#/lib/i18n";
import type { SubtitleLine } from "#/lib/stt-group";
import { MobileViewer } from "./mobile-viewer";

const lines: SubtitleLine[] = [
	{
		id: "line-1",
		speakerUid: "10001",
		sourceText: "第一句原文",
		targetTexts: { "en-US": "First line" },
		isFinal: true,
		updatedAt: 1,
	},
	{
		id: "line-2",
		speakerUid: "10002",
		sourceText: "第二句原文",
		targetTexts: { "en-US": "Second line" },
		isFinal: true,
		updatedAt: 2,
	},
];

function WrappedViewer(props: {
	state: "connecting" | "live" | "expired" | "ended" | "error";
}) {
	const [displayMode, setDisplayMode] = React.useState<
		"both" | "source" | "target"
	>("both");

	return (
		<LocaleProvider initialLocale="zh-CN">
			<MobileViewer
				state={props.state}
				errorMessage={
					props.state === "error" ? "连接失败，请重新扫码" : undefined
				}
				channelName="stt-room-1"
				sourceLanguages={["zh-CN"]}
				targetLanguages={["en-US"]}
				subtitleRenderMode="append"
				lines={lines}
				members={[]}
				displayMode={displayMode}
				onDisplayModeChange={setDisplayMode}
			/>
		</LocaleProvider>
	);
}

describe("MobileViewer", () => {
	it("renders the ended and expired states", () => {
		const { rerender } = render(<WrappedViewer state="expired" />);
		expect(screen.getByText("链接无效或已过期")).toBeTruthy();

		rerender(<WrappedViewer state="ended" />);
		expect(screen.getByText("房间字幕已结束")).toBeTruthy();
	});

	it("toggles between bilingual, original-only, and translation-only rendering", () => {
		render(<WrappedViewer state="live" />);

		expect(screen.getByText("第二句原文")).toBeTruthy();
		expect(screen.getByText("Second line")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "仅原文" }));
		expect(screen.getByText("第二句原文")).toBeTruthy();
		expect(screen.queryByText("Second line")).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "仅译文" }));
		expect(screen.queryByText("第二句原文")).toBeNull();
		expect(screen.getByText("Second line")).toBeTruthy();
	});

	it("keeps append target-only history hidden until the active target language is final", () => {
		const { container } = render(
			<LocaleProvider initialLocale="zh-CN">
				<MobileViewer
					state="live"
					channelName="stt-room-1"
					sourceLanguages={["zh-CN"]}
					targetLanguages={["en-US"]}
					subtitleRenderMode="append"
					lines={[
						{
							id: "line-1",
							speakerUid: "10001",
							sentenceId: "sent-1",
							sourceText: "第一句原文",
							targetTexts: { "en-US": "First line" },
							isFinal: true,
							updatedAt: 1,
							sourceFragments: [
								{
									fragmentKey: "10001:0",
									text: "第一句原文",
									isFinal: true,
								},
							],
							targetTextFragments: {
								"en-US": [
									{
										fragmentKey: "10001:0",
										text: "First line",
										isFinal: false,
									},
								],
							},
						},
						{
							id: "line-2",
							speakerUid: "10002",
							sentenceId: "sent-2",
							sourceText: "第二句原文",
							targetTexts: { "en-US": "Second line" },
							isFinal: false,
							updatedAt: 2,
						},
					]}
					members={[]}
					displayMode="target"
					onDisplayModeChange={() => {}}
				/>
			</LocaleProvider>,
		);

		expect(
			container.querySelectorAll(".mobile-viewer-history-item"),
		).toHaveLength(0);
		expect(container.textContent).not.toContain("First line");
		expect(container.textContent).toContain("Second line");
	});

	it("renders aligned mode current and history using static paired text", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<MobileViewer
					state="live"
					channelName="stt-room-1"
					sourceLanguages={["zh-CN"]}
					targetLanguages={["en-US"]}
					subtitleRenderMode="aligned"
					lines={lines}
					members={[]}
					displayMode="both"
					onDisplayModeChange={() => {}}
				/>
			</LocaleProvider>,
		);

		expect(screen.getByText("第二句原文")).toBeTruthy();
		expect(screen.getAllByText("Second line").length).toBeGreaterThan(0);
		expect(screen.getByText("第一句原文")).toBeTruthy();
		expect(screen.getAllByText("First line").length).toBeGreaterThan(0);
	});

	it("shows loading feedback for aligned non-final current subtitles", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<MobileViewer
					state="live"
					channelName="stt-room-1"
					sourceLanguages={["zh-CN"]}
					targetLanguages={["en-US"]}
					subtitleRenderMode="aligned"
					lines={[
						{
							id: "line-2",
							speakerUid: "10002",
							sourceText: "第二句原文",
							targetTexts: { "en-US": "Second line" },
							isFinal: false,
							updatedAt: 2,
							currentTailFragmentKey: "10002:1",
							sourceFragments: [
								{ fragmentKey: "10002:0", text: "第二句", isFinal: true },
								{ fragmentKey: "10002:1", text: "原文", isFinal: false },
							],
							targetTextFragments: {
								"en-US": [
									{
										fragmentKey: "10002:0",
										text: "Second ",
										isFinal: true,
									},
									{
										fragmentKey: "10002:1",
										text: "line",
										isFinal: false,
									},
								],
							},
						},
					]}
					members={[]}
					displayMode="both"
					onDisplayModeChange={() => {}}
				/>
			</LocaleProvider>,
		);

		expect(screen.getByLabelText("等待原文后续内容")).toBeTruthy();
		expect(
			screen.getByLabelText("等待English (United States)翻译"),
		).toBeTruthy();
	});

	it("keeps mobile aligned history consistent with delayed history commit", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<MobileViewer
					state="live"
					channelName="stt-room-1"
					sourceLanguages={["zh-CN"]}
					targetLanguages={["en-US"]}
					subtitleRenderMode="aligned"
					lines={[
						{
							id: "history:line-1",
							speakerUid: "10001",
							sourceText: "第一句稳定前缀",
							targetTexts: { "en-US": "First stable prefix" },
							isFinal: true,
							updatedAt: 1,
							sourceFragments: [
								{
									fragmentKey: "10001:0",
									text: "第一句稳定前缀",
									isFinal: true,
								},
							],
							targetTextFragments: {
								"en-US": [
									{
										fragmentKey: "10001:0",
										text: "First stable prefix",
										isFinal: true,
									},
								],
							},
						},
						{
							id: "line-2",
							speakerUid: "10002",
							sourceText: "第二句当前内容",
							targetTexts: { "en-US": "Second current line" },
							isFinal: false,
							updatedAt: 2,
							sourceFragments: [
								{
									fragmentKey: "10002:0",
									text: "第二句当前内容",
									isFinal: false,
								},
							],
							targetTextFragments: {
								"en-US": [
									{
										fragmentKey: "10002:0",
										text: "Second current line",
										isFinal: false,
									},
								],
							},
						},
					]}
					members={[]}
					displayMode="both"
					onDisplayModeChange={() => {}}
				/>
			</LocaleProvider>,
		);

		expect(screen.getByText("第一句稳定前缀")).toBeTruthy();
		expect(screen.getByText("First stable prefix")).toBeTruthy();
		expect(screen.getAllByText("第二句当前内容").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Second current line").length).toBeGreaterThan(
			0,
		);
	});

	it("shows finalized aligned history for one speaker while another speaker remains current", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<MobileViewer
					state="live"
					channelName="stt-room-1"
					sourceLanguages={["zh-CN"]}
					targetLanguages={["en-US"]}
					subtitleRenderMode="aligned"
					lines={[
						{
							id: "sentence:speaker-1-final",
							speakerUid: "10001",
							sourceText: "第一位说完了",
							targetTexts: { "en-US": "First speaker done" },
							isFinal: true,
							updatedAt: 3,
							sourceFragments: [
								{
									fragmentKey: "10001:1000",
									text: "第一位说完了",
									isFinal: true,
								},
							],
							targetTextFragments: {
								"en-US": [
									{
										fragmentKey: "10001:1000",
										text: "First speaker done",
										isFinal: true,
									},
								],
							},
						},
						{
							id: "sentence:speaker-2-live",
							speakerUid: "10002",
							sourceText: "第二位还在说",
							targetTexts: { "en-US": "Second speaker still talking" },
							isFinal: false,
							updatedAt: 2,
							currentTailFragmentKey: "10002:2000",
							sourceFragments: [
								{
									fragmentKey: "10002:2000",
									text: "第二位还在说",
									isFinal: false,
								},
							],
							targetTextFragments: {
								"en-US": [
									{
										fragmentKey: "10002:2000",
										text: "Second speaker still talking",
										isFinal: false,
									},
								],
							},
						},
					]}
					members={[]}
					displayMode="both"
					onDisplayModeChange={() => {}}
				/>
			</LocaleProvider>,
		);

		expect(screen.getByText("第一位说完了")).toBeTruthy();
		expect(screen.getByText("First speaker done")).toBeTruthy();
		expect(screen.getAllByText("第二位还在说").length).toBeGreaterThan(0);
		expect(
			screen.getAllByText("Second speaker still talking").length,
		).toBeGreaterThan(0);
	});
});
