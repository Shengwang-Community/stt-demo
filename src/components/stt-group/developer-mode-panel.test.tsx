// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeveloperModeProvider } from "#/lib/developer-mode/store";
import { LocaleProvider } from "#/lib/i18n";
import { DeveloperModePanel } from "./developer-mode-panel";

afterEach(() => {
	cleanup();
	window.localStorage.clear();
	vi.unstubAllEnvs();
});

describe("DeveloperModePanel", () => {
	it("renders request override switch and structured fields", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<DeveloperModeProvider>
					<DeveloperModePanel
						open
						onClose={() => {}}
						canRemoveExperienceLimit={false}
						experienceLimitAlreadyRemoved={false}
						onRemoveExperienceLimit={() => {}}
					/>
				</DeveloperModeProvider>
			</LocaleProvider>,
		);

		expect(screen.getByText("开发者模式")).toBeTruthy();
		expect(screen.getByText("显示 VTT 导出入口")).toBeTruthy();
		expect(screen.getByText("STT 供应商")).toBeTruthy();
		expect(screen.getByText("字幕消息格式")).toBeTruthy();
		expect(screen.getByRole("option", { name: "PB" })).toBeTruthy();
		expect(screen.getByRole("option", { name: "JSON 格式" })).toBeTruthy();
		expect(screen.getByText("字幕渲染模式")).toBeTruthy();
		expect(screen.getByRole("option", { name: "追加模式" })).toBeTruthy();
		expect(screen.getByRole("option", { name: "原文译文对齐" })).toBeTruthy();
		expect(screen.getByText("启用请求覆盖")).toBeTruthy();
		expect(screen.getByLabelText("自定义 App ID")).toBeTruthy();
		expect(screen.getByLabelText("请求域名")).toBeTruthy();
		expect(screen.getByLabelText("X-Service-Namespace")).toBeTruthy();
		expect(
			screen.getByText("仅影响当前浏览器的字幕消息解码路径。"),
		).toBeTruthy();
		expect(
			screen.getByText("控制当前浏览器的字幕归并与展示规则。"),
		).toBeTruthy();
		expect(
			screen.getByText("开发者模式开启后可编辑，请按需决定是否让覆盖生效。"),
		).toBeTruthy();
	});

	it("renders only the configured vendor options and keeps default", () => {
		vi.stubEnv("VITE_STT_VENDOR_OPTIONS", "agora,tencent");

		render(
			<LocaleProvider initialLocale="zh-CN">
				<DeveloperModeProvider>
					<DeveloperModePanel
						open
						onClose={() => {}}
						canRemoveExperienceLimit={false}
						experienceLimitAlreadyRemoved={false}
						onRemoveExperienceLimit={() => {}}
					/>
				</DeveloperModeProvider>
			</LocaleProvider>,
		);

		fireEvent.click(screen.getByLabelText("启用开发者模式"));

		expect(screen.getByRole("option", { name: "default" })).toBeTruthy();
		expect(screen.getByRole("option", { name: "agora" })).toBeTruthy();
		expect(screen.getByRole("option", { name: "tencent" })).toBeTruthy();
		expect(screen.queryByRole("option", { name: "soniox" })).toBeNull();
	});

	it("shows the vendor helper as future STT request behavior", () => {
		vi.stubEnv("VITE_STT_VENDOR_OPTIONS", "agora,tencent");

		render(
			<LocaleProvider initialLocale="zh-CN">
				<DeveloperModeProvider>
					<DeveloperModePanel
						open
						onClose={() => {}}
						canRemoveExperienceLimit={false}
						experienceLimitAlreadyRemoved={false}
						onRemoveExperienceLimit={() => {}}
					/>
				</DeveloperModeProvider>
			</LocaleProvider>,
		);

		expect(screen.getByText("影响后续新发起的 STT 请求")).toBeTruthy();
	});

	it("auto-enables request overrides after entering a custom app id", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<DeveloperModeProvider>
					<DeveloperModePanel
						open
						onClose={() => {}}
						canRemoveExperienceLimit={false}
						experienceLimitAlreadyRemoved={false}
						onRemoveExperienceLimit={() => {}}
					/>
				</DeveloperModeProvider>
			</LocaleProvider>,
		);

		fireEvent.click(screen.getByLabelText("启用开发者模式"));
		fireEvent.change(screen.getByLabelText("自定义 App ID"), {
			target: { value: "custom-app-id" },
		});

		expect(
			(screen.getByLabelText("启用请求覆盖") as HTMLInputElement).checked,
		).toBe(true);
	});

	it("keeps dependent controls disabled until developer mode is enabled", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<DeveloperModeProvider>
					<DeveloperModePanel
						open
						onClose={() => {}}
						canRemoveExperienceLimit={false}
						experienceLimitAlreadyRemoved={false}
						onRemoveExperienceLimit={() => {}}
					/>
				</DeveloperModeProvider>
			</LocaleProvider>,
		);

		expect(screen.getByText("对当前通话移除时限")).toBeTruthy();
		expect(
			(
				screen.getByRole("button", {
					name: "对当前通话移除时限",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
		expect(
			(screen.getByLabelText("显示 VTT 导出入口") as HTMLInputElement).disabled,
		).toBe(true);
		const comboboxes = screen.getAllByRole("combobox") as HTMLSelectElement[];
		expect(comboboxes).toHaveLength(3);
		expect(comboboxes[0]?.disabled).toBe(true);
		expect(comboboxes[1]?.disabled).toBe(true);
		expect(
			(screen.getByLabelText("启用请求覆盖") as HTMLInputElement).disabled,
		).toBe(true);
		expect(
			(screen.getByLabelText("自定义 App ID") as HTMLInputElement).disabled,
		).toBe(true);
		expect(
			(screen.getByLabelText("请求域名") as HTMLInputElement).disabled,
		).toBe(true);
		expect(
			(screen.getByLabelText("X-Service-Namespace") as HTMLInputElement)
				.disabled,
		).toBe(true);

		fireEvent.click(screen.getByLabelText("启用开发者模式"));

		expect(
			(
				screen.getByRole("button", {
					name: "对当前通话移除时限",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
		expect(
			(screen.getByLabelText("显示 VTT 导出入口") as HTMLInputElement).disabled,
		).toBe(false);
		expect(comboboxes[0]?.disabled).toBe(false);
		expect(comboboxes[1]?.disabled).toBe(false);
		expect(
			(screen.getByLabelText("启用请求覆盖") as HTMLInputElement).disabled,
		).toBe(false);
		expect(
			(screen.getByLabelText("自定义 App ID") as HTMLInputElement).disabled,
		).toBe(false);
		expect(
			(screen.getByLabelText("请求域名") as HTMLInputElement).disabled,
		).toBe(false);
		expect(
			(screen.getByLabelText("X-Service-Namespace") as HTMLInputElement)
				.disabled,
		).toBe(false);
	});
});
