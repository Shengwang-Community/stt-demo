// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "#/lib/i18n";
import { DEFAULT_BRAND_SETTINGS } from "#/lib/stt-group";
import { AccessOverlays } from "./access-overlays";

vi.mock("qrcode.react", () => ({
	QRCodeSVG: ({ value }: { value: string }) => (
		<div data-testid="qr-code" data-value={value} />
	),
}));

const renderOverlay = (ui: React.ReactElement) =>
	render(<LocaleProvider initialLocale="zh-CN">{ui}</LocaleProvider>);

describe("AccessOverlays QR layer", () => {
	it("shows loading, error, and ready states for the mobile viewer link", () => {
		const { rerender } = renderOverlay(
			<AccessOverlays
				channelName="stt-room-1"
				activeOverlay="qr"
				brandSettings={DEFAULT_BRAND_SETTINGS}
				pendingLogoFile={null}
				viewerUrl={null}
				viewerLinkLoading
				viewerLinkError={null}
				onBrandSettingsChange={() => {}}
				onConfirmBrandSettings={() => {}}
				onLogoSelected={() => {}}
				onLogoCanceled={() => {}}
				onLogoConfirmed={() => {}}
				onLogoReedit={() => {}}
				onClose={() => {}}
				onConfirmStop={() => {}}
			/>,
		);
		expect(screen.getByText("正在生成二维码...")).toBeTruthy();

		rerender(
			<LocaleProvider initialLocale="zh-CN">
				<AccessOverlays
					channelName="stt-room-1"
					activeOverlay="qr"
					brandSettings={DEFAULT_BRAND_SETTINGS}
					pendingLogoFile={null}
					viewerUrl={null}
					viewerLinkLoading={false}
					viewerLinkError="房间字幕已结束"
					onBrandSettingsChange={() => {}}
					onConfirmBrandSettings={() => {}}
					onLogoSelected={() => {}}
					onLogoCanceled={() => {}}
					onLogoConfirmed={() => {}}
					onLogoReedit={() => {}}
					onClose={() => {}}
					onConfirmStop={() => {}}
				/>
			</LocaleProvider>,
		);
		expect(screen.getByText("房间字幕已结束")).toBeTruthy();

		rerender(
			<LocaleProvider initialLocale="zh-CN">
				<AccessOverlays
					channelName="stt-room-1"
					activeOverlay="qr"
					brandSettings={DEFAULT_BRAND_SETTINGS}
					pendingLogoFile={null}
					viewerUrl="https://demo.example.com/mobile?viewerToken=abc"
					viewerLinkLoading={false}
					viewerLinkError={null}
					onBrandSettingsChange={() => {}}
					onConfirmBrandSettings={() => {}}
					onLogoSelected={() => {}}
					onLogoCanceled={() => {}}
					onLogoConfirmed={() => {}}
					onLogoReedit={() => {}}
					onClose={() => {}}
					onConfirmStop={() => {}}
				/>
			</LocaleProvider>,
		);
		expect(screen.getByTestId("qr-code").getAttribute("data-value")).toBe(
			"https://demo.example.com/mobile?viewerToken=abc",
		);
	});
});

describe("AccessOverlays advanced layer", () => {
	it("shows the design-aligned advanced settings cards", () => {
		renderOverlay(
			<AccessOverlays
				channelName="stt-room-1"
				activeOverlay="advanced"
				brandSettings={DEFAULT_BRAND_SETTINGS}
				pendingLogoFile={null}
				onBrandSettingsChange={() => {}}
				onConfirmBrandSettings={() => {}}
				onLogoSelected={() => {}}
				onLogoCanceled={() => {}}
				onLogoConfirmed={() => {}}
				onLogoReedit={() => {}}
				onClose={() => {}}
				onConfirmStop={() => {}}
			/>,
		);

		expect(screen.getByText("通用上下文")).toBeTruthy();
		expect(screen.getByText("背景参考文本")).toBeTruthy();
		expect(screen.getByText("自定义 ASR 热词")).toBeTruthy();
		expect(screen.getByText("翻译术语")).toBeTruthy();
	});

	it("shows the design-aligned apply confirmation when saving a drawer", () => {
		renderOverlay(
			<AccessOverlays
				channelName="stt-room-1"
				activeOverlay="advanced"
				brandSettings={DEFAULT_BRAND_SETTINGS}
				pendingLogoFile={null}
				onBrandSettingsChange={() => {}}
				onConfirmBrandSettings={() => {}}
				onLogoSelected={() => {}}
				onLogoCanceled={() => {}}
				onLogoConfirmed={() => {}}
				onLogoReedit={() => {}}
				onClose={() => {}}
				onConfirmStop={() => {}}
			/>,
		);

		fireEvent.click(
			screen.getAllByRole("button", {
				name: /通用上下文.*领域、主题、角色等结构化数据.*JSON/,
			})[0]!,
		);
		fireEvent.click(screen.getByRole("button", { name: "保存并应用" }));

		expect(screen.getByText("应用设置？")).toBeTruthy();
		expect(
			screen.getByText("修改将影响当前房间后续新产生的字幕结果。"),
		).toBeTruthy();
		expect(screen.getByRole("button", { name: "确认并应用" })).toBeTruthy();
	});

	it("renders the apply confirmation overlay directly for debug capture", () => {
		renderOverlay(
			<AccessOverlays
				channelName="stt-room-1"
				activeOverlay="confirm-apply"
				brandSettings={DEFAULT_BRAND_SETTINGS}
				pendingLogoFile={null}
				onBrandSettingsChange={() => {}}
				onConfirmBrandSettings={() => {}}
				onLogoSelected={() => {}}
				onLogoCanceled={() => {}}
				onLogoConfirmed={() => {}}
				onLogoReedit={() => {}}
				onClose={() => {}}
				onConfirmStop={() => {}}
			/>,
		);

		expect(screen.getAllByText("应用设置？").length).toBeGreaterThan(0);
		expect(
			screen.getAllByRole("button", { name: "确认并应用" }).length,
		).toBeGreaterThan(0);
	});
});
