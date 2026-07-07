import { describe, expect, it } from "vitest";
import { getMessageKeys } from "./catalog";
import {
	isProductLocale,
	resolveEnvironmentDefaultLocale,
} from "./locale";

describe("i18n locale helpers", () => {
	it("accepts only zh-CN and en-US as product locales", () => {
		expect(isProductLocale("zh-CN")).toBe(true);
		expect(isProductLocale("en-US")).toBe(true);
		expect(isProductLocale("fr-FR")).toBe(false);
	});

	it("falls back to en-US when VITE_LOCALE is absent or invalid", () => {
		expect(resolveEnvironmentDefaultLocale(undefined)).toBe("en-US");
		expect(resolveEnvironmentDefaultLocale("fr-FR")).toBe("en-US");
		expect(resolveEnvironmentDefaultLocale("zh-CN")).toBe("zh-CN");
	});

	it("keeps zh-CN and en-US catalogs structurally aligned", () => {
		expect(getMessageKeys("zh-CN")).toEqual(getMessageKeys("en-US"));
	});
});

