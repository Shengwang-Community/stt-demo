// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "#/lib/i18n";
import { LocaleSwitchMenu } from "./locale-switch-menu";

vi.mock("@tanstack/react-start", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@tanstack/react-start")>();
	return {
		...actual,
		useServerFn: () => vi.fn(async () => undefined),
	};
});

describe("LocaleSwitchMenu", () => {
	it("renders listbox-style selected options with the shared select classes", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<LocaleSwitchMenu
					buttonClassName="icon-btn"
					menuClassName="land-lang-pop custom-select-pop stt-root-popover stt-choice__popover stt-choice__popover--content-aware"
					optionClassName="custom-select-option"
					checkClassName="custom-select-check"
					menuRole="listbox"
				/>
			</LocaleProvider>,
		);

		fireEvent.click(screen.getByRole("button", { name: "语言" }));

		const selectedOption = screen.getByRole("option", { name: "中文" });
		expect(selectedOption.className).toContain("custom-select-option");
		expect(selectedOption.getAttribute("aria-selected")).toBe("true");
		expect(screen.getByRole("option", { name: "English" })).toBeTruthy();
	});
});
