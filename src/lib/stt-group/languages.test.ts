import { describe, expect, it } from "vitest";
import {
	DEFAULT_MULTI_SOURCE_LANGUAGES,
	DEFAULT_SINGLE_SOURCE_LANGUAGE,
	DEFAULT_TARGET_LANGUAGES,
	getLanguageLabel,
	normalizeLanguageSelection,
	resolveSourceLanguagesForRecognitionModeChange,
	validateLanguageSelection,
} from "./languages";

describe("STT group language helpers", () => {
	it("uses the Shengwang supported-languages pool", () => {
		expect(DEFAULT_SINGLE_SOURCE_LANGUAGE).toBe("zh-CN");
		expect(DEFAULT_MULTI_SOURCE_LANGUAGES).toEqual(["zh-CN", "en-US"]);
		expect(DEFAULT_TARGET_LANGUAGES).toEqual(["en-US"]);
		expect(getLanguageLabel("de-DE")).toBe("German (Germany)");
		expect(getLanguageLabel("ko-KR")).toBe("Korean");
		expect(getLanguageLabel("wuu-CN")).toBe("Wu Chinese");
	});

	it("normalizes single-source selections and removes the source target", () => {
		expect(
			normalizeLanguageSelection({
				recognitionMode: "single",
				sourceLanguages: ["zh-CN", "en-US"],
				targetLanguages: ["zh-CN", "en-US", "de-DE"],
			}),
		).toEqual({
			recognitionMode: "single",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US", "de-DE"],
		});
	});

	it("normalizes multi-source selections to the join API limits", () => {
		expect(
			normalizeLanguageSelection({
				recognitionMode: "multi",
				sourceLanguages: ["zh-CN", "en-US", "ja-JP", "de-DE", "zh-CN"],
				targetLanguages: ["zh-CN", "en-US", "ja-JP", "de-DE"],
			}),
		).toEqual({
			recognitionMode: "multi",
			sourceLanguages: ["zh-CN", "en-US", "ja-JP", "de-DE"],
			targetLanguages: ["zh-CN", "en-US", "ja-JP", "de-DE"],
		});
	});

	it("preserves the selected source when switching into multi recognition", () => {
		expect(
			resolveSourceLanguagesForRecognitionModeChange({
				currentMode: "auto",
				nextMode: "multi",
				sourceLanguages: ["zh-CN"],
			}),
		).toEqual(["zh-CN"]);

		expect(
			resolveSourceLanguagesForRecognitionModeChange({
				currentMode: "single",
				nextMode: "multi",
				sourceLanguages: ["ja-JP"],
			}),
		).toEqual(["ja-JP"]);
	});

	it("accepts auto recognition without source languages and targets only", () => {
		expect(
			validateLanguageSelection({
				recognitionMode: "auto",
				sourceLanguages: [],
				targetLanguages: ["en-US", "ja-JP"],
			}),
		).toEqual({
			ok: true,
			selection: {
				recognitionMode: "auto",
				sourceLanguages: ["auto"],
				targetLanguages: ["en-US", "ja-JP"],
			},
		});

		expect(
			validateLanguageSelection({
				recognitionMode: "auto",
				sourceLanguages: [],
				targetLanguages: ["xx-XX"],
			}),
		).toEqual({ ok: false, message: "Unsupported target language: xx-XX" });

		expect(
			validateLanguageSelection({
				recognitionMode: "auto",
				sourceLanguages: [],
				targetLanguages: [],
			}),
		).toEqual({ ok: false, message: "Select 1 to 10 target languages" });
	});

	it("rejects unsupported modes, languages, and invalid target overlap", () => {
		expect(
			validateLanguageSelection({
				recognitionMode: "bogus" as never,
				sourceLanguages: ["zh-CN"],
				targetLanguages: ["en-US"],
			}),
		).toEqual({ ok: false, message: "Invalid recognition mode" });

		expect(
			validateLanguageSelection({
				recognitionMode: "single",
				sourceLanguages: ["zh-CN"],
				targetLanguages: ["zh-CN"],
			}),
		).toEqual({
			ok: false,
			message: "Target languages must not include the single source language",
		});

		expect(
			validateLanguageSelection({
				recognitionMode: "multi",
				sourceLanguages: ["zh-CN", "xx-XX"],
				targetLanguages: ["en-US"],
			}),
		).toEqual({ ok: false, message: "Unsupported source language: xx-XX" });
	});
});
