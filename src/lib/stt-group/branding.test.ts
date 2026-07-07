import { describe, expect, it } from "vitest";
import {
	BRANDING_STORAGE_KEY,
	DEFAULT_BRAND_SETTINGS,
	MAX_BRAND_NAME_LENGTH,
	clampBrandName,
	createBrandSettings,
	getBrandNameRemaining,
	isSupportedLogoFile,
} from "./branding";

describe("branding helpers", () => {
	it("trims and clamps the product name to the PRD limit", () => {
		expect(clampBrandName("  Agora STT  ")).toBe("Agora STT");
		expect(clampBrandName("x".repeat(MAX_BRAND_NAME_LENGTH + 5))).toBe(
			"x".repeat(MAX_BRAND_NAME_LENGTH),
		);
	});

	it("reports remaining characters from the clamped value", () => {
		expect(getBrandNameRemaining("Agora")).toBe(MAX_BRAND_NAME_LENGTH - 5);
	});

	it("builds brand settings with defaults", () => {
		expect(
			createBrandSettings({
				productName: "  My Brand  ",
			}),
		).toEqual({
			...DEFAULT_BRAND_SETTINGS,
			productName: "My Brand",
		});
	});

	it("accepts only the PRD logo file types", () => {
		expect(isSupportedLogoFile({ type: "image/png", name: "logo.png" })).toBe(
			true,
		);
		expect(isSupportedLogoFile({ type: "image/jpeg", name: "logo.jpg" })).toBe(
			true,
		);
		expect(
			isSupportedLogoFile({ type: "image/svg+xml", name: "logo.svg" }),
		).toBe(true);
		expect(isSupportedLogoFile({ type: "image/gif", name: "logo.gif" })).toBe(
			false,
		);
	});

	it("keeps the storage key stable", () => {
		expect(BRANDING_STORAGE_KEY).toBe("stt-demo.brand-settings");
	});
});
