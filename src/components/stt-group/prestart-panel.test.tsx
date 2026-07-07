// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "#/lib/i18n";
import type { PrestartRecognitionMode } from "./prestart-panel";
import { PrestartPanel } from "./prestart-panel";

afterEach(() => {
	cleanup();
});

const renderPanel = (
	overrides?: Partial<React.ComponentProps<typeof PrestartPanel>>,
) =>
	render(
		<LocaleProvider initialLocale="zh-CN">
			<PrestartPanel
				mode="create"
				channelName="demo-room"
				nickname="Alice"
				recognitionMode={"auto" as PrestartRecognitionMode}
				sourceLanguages={["zh-CN"]}
				targetLanguages={["en-US"]}
				microphoneDevices={[
					{ deviceId: "mic-1", label: "Shure MV7" },
					{ deviceId: "mic-2", label: "MacBook Pro 麦克风" },
				]}
				selectedMicrophoneDeviceId="mic-1"
				cameraDevices={[{ deviceId: "cam-1", label: "Sony ZV-E10" }]}
				selectedCameraDeviceId="cam-1"
				subtitleDisplayMode="both"
				busy={false}
				canStart
				microphoneMuted={false}
				cameraEnabled={false}
				onChannelNameChange={vi.fn()}
				onNicknameChange={vi.fn()}
				onRecognitionModeChange={vi.fn()}
				onSourceLanguagesChange={vi.fn()}
				onTargetLanguagesChange={vi.fn()}
				onSubtitleDisplayModeChange={vi.fn()}
				onSelectMicrophoneDevice={vi.fn()}
				onSelectCameraDevice={vi.fn()}
				onToggleMicrophone={vi.fn()}
				onToggleCamera={vi.fn()}
				onStart={vi.fn()}
				onRandomChannelName={vi.fn()}
				onModeChange={vi.fn()}
				onOpenAdvanced={vi.fn()}
				localVideoRef={vi.fn()}
				{...overrides}
			/>
		</LocaleProvider>,
	);

describe("PrestartPanel", () => {
	it("matches the design affordance for auto recognition and advanced settings entry", () => {
		const onRecognitionModeChange = vi.fn();
		renderPanel({ onRecognitionModeChange });

		const autoButton = screen.getByRole("button", { name: "自动识别" });
		expect(autoButton.hasAttribute("disabled")).toBe(false);
		expect(autoButton.getAttribute("aria-pressed")).toBe("true");
		expect(screen.queryByText("源语言")).toBeNull();
		expect(screen.getByText("4 项")).toBeTruthy();
		expect(screen.getByText("上下文 · 参考文本 · 热词 · 术语")).toBeTruthy();
		expect(screen.queryByText("JSON")).toBeNull();

		fireEvent.click(autoButton);
		expect(onRecognitionModeChange).toHaveBeenCalledWith("auto");
	});

	it("orders recognition modes as single, multi, then auto", () => {
		renderPanel({
			recognitionMode: "single",
		});

		const modeButtons = screen
			.getByRole("group", { name: "识别模式" })
			.querySelectorAll("button");

		expect([...modeButtons].map((button) => button.textContent)).toEqual([
			"指定单语种",
			"多语种识别",
			"自动识别",
		]);
		expect(modeButtons[2]?.hasAttribute("disabled")).toBe(false);
	});

	it("splits language settings into two visual cards like the design", () => {
		const { container } = renderPanel();

		expect(container.querySelectorAll(".prestart-language-card").length).toBe(
			2,
		);
	});

	it("shows create and join tabs and hides language settings in join mode", () => {
		const { container } = renderPanel({
			mode: "join",
		});

		expect(screen.getByRole("tab", { name: "创建" })).toBeTruthy();
		expect(screen.getByRole("tab", { name: "加入" })).toBeTruthy();
		expect(screen.queryByText("语言设置")).toBeNull();
		expect(screen.getByText("立即加入")).toBeTruthy();
		expect(container.querySelectorAll(".prestart-language-card").length).toBe(
			0,
		);
	});

	it("shows source-language field in single recognition mode without duplicate control", () => {
		renderPanel({
			recognitionMode: "single",
		});

		expect(screen.getByText("源语言")).toBeTruthy();
		expect(screen.getAllByText("指定单语种")).toHaveLength(1);
	});

	it("renders the single-language source select as plain selected text", () => {
		const { container } = renderPanel({
			recognitionMode: "single",
		});

		const trigger = container.querySelector(
			".stt-searchable-multi-select__trigger",
		);
		expect(trigger).toBeTruthy();
		expect(trigger?.querySelector(".stt-multi-select__tag")).toBeNull();
		expect(trigger?.querySelector(".multi-language-plain-value")).toBeTruthy();
		expect(
			trigger?.querySelector(".multi-language-plain-value button"),
		).toBeTruthy();
	});

	it("keeps the shared source picker single-select in single recognition mode", () => {
		const onSourceLanguagesChange = vi.fn();
		renderPanel({
			recognitionMode: "single",
			sourceLanguages: ["zh-CN"],
			onSourceLanguagesChange,
		});

		fireEvent.click(screen.getByRole("button", { name: "源语言" }));
		fireEvent.click(
			screen.getByRole("option", {
				name: "English (United States)-英语（美国）-en-US",
			}),
		);

		expect(onSourceLanguagesChange).toHaveBeenCalledWith(["en-US"]);
	});

	it("allows clearing the single source language so the route form check can block start", () => {
		const onSourceLanguagesChange = vi.fn();
		renderPanel({
			recognitionMode: "single",
			sourceLanguages: ["zh-CN"],
			onSourceLanguagesChange,
		});

		fireEvent.click(
			screen.getByRole("button", { name: "移除 Chinese (China)" }),
		);

		expect(onSourceLanguagesChange).toHaveBeenCalledWith([]);
	});

	it("keeps the start button clickable when language placeholders are empty", () => {
		const onStart = vi.fn();
		renderPanel({
			recognitionMode: "single",
			sourceLanguages: [],
			targetLanguages: [],
			canStart: true,
			onStart,
		});

		expect(screen.getByText("选择源语言")).toBeTruthy();
		expect(screen.getByText("选择翻译目标语言")).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "开始" }).hasAttribute("disabled"),
		).toBe(false);
		fireEvent.click(screen.getByRole("button", { name: "开始" }));
		expect(onStart).toHaveBeenCalledOnce();
	});

	it("shows room copy affordance only in create mode", () => {
		const { rerender } = renderPanel();

		expect(screen.getByRole("button", { name: "复制房间号" })).toBeTruthy();

		rerender(
			<LocaleProvider initialLocale="zh-CN">
				<PrestartPanel
					mode="join"
					channelName="demo-room"
					nickname="Alice"
					recognitionMode="single"
					sourceLanguages={["zh-CN"]}
					targetLanguages={["en-US"]}
					microphoneDevices={[]}
					selectedMicrophoneDeviceId=""
					cameraDevices={[]}
					selectedCameraDeviceId=""
					subtitleDisplayMode="both"
					busy={false}
					canStart
					microphoneMuted={false}
					cameraEnabled={false}
					onChannelNameChange={vi.fn()}
					onNicknameChange={vi.fn()}
					onRecognitionModeChange={vi.fn()}
					onSourceLanguagesChange={vi.fn()}
					onTargetLanguagesChange={vi.fn()}
					onSubtitleDisplayModeChange={vi.fn()}
					onSelectMicrophoneDevice={vi.fn()}
					onSelectCameraDevice={vi.fn()}
					onToggleMicrophone={vi.fn()}
					onToggleCamera={vi.fn()}
					onStart={vi.fn()}
					onRandomChannelName={vi.fn()}
					onModeChange={vi.fn()}
					onOpenAdvanced={vi.fn()}
					localVideoRef={vi.fn()}
				/>
			</LocaleProvider>,
		);

		expect(screen.queryByRole("button", { name: "复制房间号" })).toBeNull();
	});

	it("renders supplied microphone and camera device options", () => {
		renderPanel();

		expect(screen.getByRole("option", { name: "Shure MV7" })).toBeTruthy();
		expect(
			screen.getByRole("option", { name: "MacBook Pro 麦克风" }),
		).toBeTruthy();
		expect(screen.getByRole("option", { name: "Sony ZV-E10" })).toBeTruthy();
	});

	it("renders an empty live video mount instead of a static preview image when camera is enabled", () => {
		const { container } = renderPanel({
			microphoneMuted: false,
			cameraEnabled: true,
			microphoneReady: false,
		});

		expect(screen.getByText("未授权 · 先显示授权引导")).toBeTruthy();
		expect(screen.getAllByRole("button", { name: "开启" }).length).toBe(1);
		expect(screen.getByText("已开启 · 本地预览")).toBeTruthy();
		expect(screen.getByRole("button", { name: "关闭" })).toBeTruthy();
		expect(screen.queryByText("摄像头不可用")).toBeNull();
		expect(screen.queryByText("PREVIEW")).toBeNull();
		expect(container.querySelector(".camera-preview-live")).toBeNull();
		expect(container.querySelector(".camera-preview")).toBeTruthy();
	});

	it("uses a single full-width footer CTA without quick media buttons", () => {
		const { container } = renderPanel();

		expect(
			container.querySelector(".stt-prestart-footer__quickset"),
		).toBeNull();
		expect(
			container.querySelector(".stt-prestart-footer__icon-button"),
		).toBeNull();
		expect(screen.getByRole("button", { name: "开始" })).toBeTruthy();
	});

	it("shows the camera preview placeholder structure when camera preview is off", () => {
		renderPanel({
			cameraEnabled: false,
		});

		expect(screen.getByText("已关闭")).toBeTruthy();
		expect(screen.getByText("摄像头不可用")).toBeTruthy();
	});

	it("allows removing the last selected target language chip to match the design behavior", () => {
		const onTargetLanguagesChange = vi.fn();

		renderPanel({
			onTargetLanguagesChange,
			targetLanguages: ["en-US"],
		});

		fireEvent.click(
			screen.getByRole("button", { name: "移除 English (United States)" }),
		);

		expect(onTargetLanguagesChange).toHaveBeenCalledWith([]);
	});

	it("renders a single target language as plain selected text in single recognition mode", () => {
		const { container } = renderPanel({
			recognitionMode: "single",
			targetLanguages: ["en-US"],
		});

		const targetTrigger = container.querySelector(
			'[data-menu-id="target-languages"] .stt-searchable-multi-select__trigger',
		);

		expect(targetTrigger?.querySelector(".stt-multi-select__tag")).toBeNull();
		expect(
			targetTrigger?.querySelector(".multi-language-plain-value"),
		).toBeTruthy();
	});

	it("opens the target-language popup with the design preset options", () => {
		renderPanel({
			targetLanguages: ["en-US"],
		});

		fireEvent.click(screen.getByRole("button", { name: "翻译为" }));

		expect(screen.getByPlaceholderText("搜索翻译语言")).toBeTruthy();
		expect(
			screen.getByRole("option", {
				name: "Chinese (China)-中文（中国大陆）-zh-CN",
			}),
		).toBeTruthy();
		expect(
			screen.queryByRole("option", {
				name: "Afrikaans-Afrikaans-af-ZA",
			}),
		).toBeNull();
		fireEvent.change(screen.getByPlaceholderText("搜索翻译语言"), {
			target: { value: "en-US" },
		});
		expect(
			screen.getByRole("option", {
				name: "English (United States)-英语（美国）-en-US",
			}),
		).toBeTruthy();
		fireEvent.change(screen.getByPlaceholderText("搜索翻译语言"), {
			target: { value: "ja-JP" },
		});
		expect(
			screen.getByRole("option", {
				name: "Japanese-日语（日本）-ja-JP",
			}),
		).toBeTruthy();
		fireEvent.change(screen.getByPlaceholderText("搜索翻译语言"), {
			target: { value: "de-DE" },
		});
		expect(
			screen.getByRole("option", {
				name: "German (Germany)-德语（德国）-de-DE",
			}),
		).toBeTruthy();
		fireEvent.change(screen.getByPlaceholderText("搜索翻译语言"), {
			target: { value: "Afrikaans" },
		});
		expect(
			screen.getByRole("option", {
				name: "Afrikaans-Afrikaans-af-ZA",
			}),
		).toBeTruthy();
	});

	it("uses the design source-language search placeholder in multi-source mode", () => {
		renderPanel({
			recognitionMode: "multi",
			sourceLanguages: ["zh-CN"],
		});

		fireEvent.click(screen.getByRole("button", { name: "源语言" }));

		expect(screen.getByPlaceholderText("搜索源语言")).toBeTruthy();
		expect(
			screen.getByRole("option", {
				name: "Chinese (China)-中文（中国大陆）-zh-CN",
			}),
		).toBeTruthy();
		expect(
			screen.getByRole("option", {
				name: "English (United States)-英语（美国）-en-US",
			}),
		).toBeTruthy();
		expect(
			screen.queryByRole("option", { name: "Afrikaans-Afrikaans-af-ZA" }),
		).toBeNull();
		fireEvent.change(screen.getByPlaceholderText("搜索源语言"), {
			target: { value: "Afrikaans" },
		});
		expect(
			screen.getByRole("option", {
				name: "Afrikaans-Afrikaans-af-ZA",
			}),
		).toBeTruthy();
	});

	it("renders the target-language multi-select with shared multi-select classes and selected tags for multiple targets", () => {
		const { container } = renderPanel({
			recognitionMode: "single",
			targetLanguages: ["en-US", "ja-JP"],
		});

		expect(container.querySelector(".stt-multi-select")).toBeTruthy();
		expect(
			container.querySelector(
				".stt-searchable-multi-select, .stt-multi-language-picker",
			),
		).toBeTruthy();
		expect(
			container.querySelectorAll(
				'[data-menu-id="target-languages"] .stt-multi-select__tag',
			).length,
		).toBe(2);
	});

	it("shows subtitle-display options via a custom trigger like the design", () => {
		renderPanel();

		fireEvent.click(screen.getByRole("button", { name: "字幕显示" }));

		expect(screen.getByRole("option", { name: "原文+译文" })).toBeTruthy();
		expect(screen.getByRole("option", { name: "仅原文" })).toBeTruthy();
		expect(screen.getByRole("option", { name: "仅译文" })).toBeTruthy();
		expect(screen.queryByRole("combobox", { name: "字幕显示" })).toBeNull();
	});
});
