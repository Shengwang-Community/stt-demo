import { describe, expect, it } from "vitest";
import {
	DEFAULT_DEVELOPER_MODE_VENDOR,
	getAllowedSttVendorsFromEnv,
	isAllowedSttVendor,
} from "./vendor-options";

describe("getAllowedSttVendorsFromEnv", () => {
	it("falls back to only default when the env is empty", () => {
		expect(getAllowedSttVendorsFromEnv({})).toEqual([
			DEFAULT_DEVELOPER_MODE_VENDOR,
		]);
	});

	it("keeps configured order, filters invalid values, and removes duplicates", () => {
		expect(
			getAllowedSttVendorsFromEnv({
				VITE_STT_VENDOR_OPTIONS: "soniox,invalid,agora,soniox,deepgram",
			}),
		).toEqual(["default", "soniox", "agora", "deepgram"]);
	});
});

describe("isAllowedSttVendor", () => {
	it("accepts a configured vendor", () => {
		expect(
			isAllowedSttVendor("tencent", {
				VITE_STT_VENDOR_OPTIONS: "agora,tencent",
			}),
		).toBe(true);
	});

	it("rejects a supported but not configured vendor", () => {
		expect(
			isAllowedSttVendor("soniox", {
				VITE_STT_VENDOR_OPTIONS: "agora,tencent",
			}),
		).toBe(false);
	});
});
