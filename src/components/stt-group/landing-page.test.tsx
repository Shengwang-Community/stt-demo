// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "#/lib/i18n";
import { LandingPage } from "./landing-page";

describe("LandingPage", () => {
	afterEach(() => {
		document.body.classList.remove("pointer-active");
		document.documentElement.style.removeProperty("--pointer-x");
		document.documentElement.style.removeProperty("--pointer-y");
		vi.unstubAllGlobals();
	});

	it("activates pointer glow on fine-pointer movement", () => {
		vi.stubGlobal(
			"matchMedia",
			(query: string) =>
				({
					matches: query === "(pointer: fine)",
					media: query,
					onchange: null,
					addEventListener: () => {},
					removeEventListener: () => {},
					addListener: () => {},
					removeListener: () => {},
					dispatchEvent: () => false,
				}) as MediaQueryList,
		);
		vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
			callback(16);
			return 1;
		});
		vi.stubGlobal("cancelAnimationFrame", vi.fn());

		render(
			<LocaleProvider initialLocale="zh-CN">
				<LandingPage onLogin={() => {}} onPrimaryAction={() => {}} />
			</LocaleProvider>,
		);

		fireEvent.pointerMove(window, { clientX: 320, clientY: 180 });

		expect(document.body.classList.contains("pointer-active")).toBe(true);
		expect(
			document.documentElement.style.getPropertyValue("--pointer-x"),
		).toBeTruthy();
		expect(
			document.documentElement.style.getPropertyValue("--pointer-y"),
		).toBeTruthy();
	});

	it("shows plugin, skin settings, and logout in the logged-in avatar menu", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<LandingPage
					onLogin={() => {}}
					onPrimaryAction={() => {}}
					onLogout={() => {}}
					onOpenPlugin={() => {}}
					onOpenSkinSettings={() => {}}
					loggedIn
					avatarLabel="刘"
				/>
			</LocaleProvider>,
		);

		fireEvent.click(screen.getByRole("button", { name: "已登录用户" }));

		expect(screen.getByRole("menuitem", { name: "悬浮字幕插件" })).toBeTruthy();
		expect(screen.getByRole("menuitem", { name: "🎨 皮肤设置" })).toBeTruthy();
		expect(screen.getByRole("menuitem", { name: "退出登录" })).toBeTruthy();
	});
});
