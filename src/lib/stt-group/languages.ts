export type LanguageCode = string;
export type RecognitionMode = "single" | "multi" | "auto";

export const AUTO_LANGUAGE_TOKEN = "auto";

export type LanguageOption = {
	value: LanguageCode;
	label: string;
	fullLabel: string;
};

export const SUPPORTED_LANGUAGES = [
	{ value: "af-ZA", label: "Afrikaans", fullLabel: "Afrikaans · af-ZA" },
	{ value: "sq-AL", label: "Albanian", fullLabel: "Albanian · sq-AL" },
	{ value: "am-ET", label: "Amharic", fullLabel: "Amharic · am-ET" },
	{
		value: "ar-DZ",
		label: "Arabic (Algeria)",
		fullLabel: "Arabic (Algeria) · ar-DZ",
	},
	{
		value: "ar-BH",
		label: "Arabic (Bahrain)",
		fullLabel: "Arabic (Bahrain) · ar-BH",
	},
	{
		value: "ar-EG",
		label: "Arabic (Egypt)",
		fullLabel: "Arabic (Egypt) · ar-EG",
	},
	{
		value: "ar-IQ",
		label: "Arabic (Iraq)",
		fullLabel: "Arabic (Iraq) · ar-IQ",
	},
	{
		value: "ar-IL",
		label: "Arabic (Israel)",
		fullLabel: "Arabic (Israel) · ar-IL",
	},
	{
		value: "ar-JO",
		label: "Arabic (Jordan)",
		fullLabel: "Arabic (Jordan) · ar-JO",
	},
	{
		value: "ar-KW",
		label: "Arabic (Kuwait)",
		fullLabel: "Arabic (Kuwait) · ar-KW",
	},
	{
		value: "ar-LB",
		label: "Arabic (Lebanon)",
		fullLabel: "Arabic (Lebanon) · ar-LB",
	},
	{
		value: "ar-LY",
		label: "Arabic (Libya)",
		fullLabel: "Arabic (Libya) · ar-LY",
	},
	{
		value: "ar-MA",
		label: "Arabic (Morocco)",
		fullLabel: "Arabic (Morocco) · ar-MA",
	},
	{
		value: "ar-OM",
		label: "Arabic (Oman)",
		fullLabel: "Arabic (Oman) · ar-OM",
	},
	{
		value: "ar-PS",
		label: "Arabic (Palestinian Territories)",
		fullLabel: "Arabic (Palestinian Territories) · ar-PS",
	},
	{
		value: "ar-QA",
		label: "Arabic (Qatar)",
		fullLabel: "Arabic (Qatar) · ar-QA",
	},
	{
		value: "ar-SA",
		label: "Arabic (Saudi Arabia)",
		fullLabel: "Arabic (Saudi Arabia) · ar-SA",
	},
	{
		value: "ar-SY",
		label: "Arabic (Syria)",
		fullLabel: "Arabic (Syria) · ar-SY",
	},
	{
		value: "ar-TN",
		label: "Arabic (Tunisia)",
		fullLabel: "Arabic (Tunisia) · ar-TN",
	},
	{
		value: "ar-AE",
		label: "Arabic (United Arab Emirates)",
		fullLabel: "Arabic (United Arab Emirates) · ar-AE",
	},
	{
		value: "ar-YE",
		label: "Arabic (Yemen)",
		fullLabel: "Arabic (Yemen) · ar-YE",
	},
	{ value: "hy-AM", label: "Armenian", fullLabel: "Armenian · hy-AM" },
	{ value: "as-IN", label: "Assamese", fullLabel: "Assamese · as-IN" },
	{ value: "az-AZ", label: "Azerbaijani", fullLabel: "Azerbaijani · az-AZ" },
	{
		value: "bn-BD",
		label: "Bangla (Bangladesh)",
		fullLabel: "Bangla (Bangladesh) · bn-BD",
	},
	{
		value: "bn-IN",
		label: "Bangla (India)",
		fullLabel: "Bangla (India) · bn-IN",
	},
	{ value: "ba-RU", label: "Bashkir", fullLabel: "Bashkir · ba-RU" },
	{ value: "eu-ES", label: "Basque", fullLabel: "Basque · eu-ES" },
	{ value: "be-BY", label: "Belarusian", fullLabel: "Belarusian · be-BY" },
	{ value: "bs-BA", label: "Bosnian", fullLabel: "Bosnian · bs-BA" },
	{ value: "br-FR", label: "Breton", fullLabel: "Breton · br-FR" },
	{ value: "bg-BG", label: "Bulgarian", fullLabel: "Bulgarian · bg-BG" },
	{ value: "my-MM", label: "Burmese", fullLabel: "Burmese · my-MM" },
	{
		value: "yue-CN",
		label: "Cantonese (China)",
		fullLabel: "Cantonese (China) · yue-CN",
	},
	{
		value: "yue-Hant-HK",
		label: "Cantonese (Hong Kong)",
		fullLabel: "Cantonese (Traditional, Hong Kong) · yue-Hant-HK",
	},
	{ value: "ca-ES", label: "Catalan", fullLabel: "Catalan · ca-ES" },
	{
		value: "zh-CN",
		label: "Chinese (China)",
		fullLabel: "Chinese (China) · zh-CN",
	},
	{
		value: "zh-HK",
		label: "Chinese (Hong Kong)",
		fullLabel: "Chinese (Hong Kong) · zh-HK",
	},
	{
		value: "zh-TW",
		label: "Chinese (Taiwan)",
		fullLabel: "Chinese (Taiwan) · zh-TW",
	},
	{ value: "hr-HR", label: "Croatian", fullLabel: "Croatian · hr-HR" },
	{ value: "cs-CZ", label: "Czech", fullLabel: "Czech · cs-CZ" },
	{ value: "da-DK", label: "Danish", fullLabel: "Danish · da-DK" },
	{
		value: "nl-BE",
		label: "Dutch (Belgium)",
		fullLabel: "Dutch (Belgium) · nl-BE",
	},
	{
		value: "nl-NL",
		label: "Dutch (Netherlands)",
		fullLabel: "Dutch (Netherlands) · nl-NL",
	},
	{
		value: "en-AU",
		label: "English (Australia)",
		fullLabel: "English (Australia) · en-AU",
	},
	{
		value: "en-CA",
		label: "English (Canada)",
		fullLabel: "English (Canada) · en-CA",
	},
	{
		value: "en-GH",
		label: "English (Ghana)",
		fullLabel: "English (Ghana) · en-GH",
	},
	{
		value: "en-HK",
		label: "English (Hong Kong)",
		fullLabel: "English (Hong Kong) · en-HK",
	},
	{
		value: "en-IN",
		label: "English (India)",
		fullLabel: "English (India) · en-IN",
	},
	{
		value: "en-IE",
		label: "English (Ireland)",
		fullLabel: "English (Ireland) · en-IE",
	},
	{
		value: "en-KE",
		label: "English (Kenya)",
		fullLabel: "English (Kenya) · en-KE",
	},
	{
		value: "en-NZ",
		label: "English (New Zealand)",
		fullLabel: "English (New Zealand) · en-NZ",
	},
	{
		value: "en-NG",
		label: "English (Nigeria)",
		fullLabel: "English (Nigeria) · en-NG",
	},
	{
		value: "en-PK",
		label: "English (Pakistan)",
		fullLabel: "English (Pakistan) · en-PK",
	},
	{
		value: "en-PH",
		label: "English (Philippines)",
		fullLabel: "English (Philippines) · en-PH",
	},
	{
		value: "en-SG",
		label: "English (Singapore)",
		fullLabel: "English (Singapore) · en-SG",
	},
	{
		value: "en-ZA",
		label: "English (South Africa)",
		fullLabel: "English (South Africa) · en-ZA",
	},
	{
		value: "en-TZ",
		label: "English (Tanzania)",
		fullLabel: "English (Tanzania) · en-TZ",
	},
	{
		value: "en-GB",
		label: "English (United Kingdom)",
		fullLabel: "English (United Kingdom) · en-GB",
	},
	{
		value: "en-UK",
		label: "English (United Kingdom)",
		fullLabel: "English (United Kingdom) · en-UK",
	},
	{
		value: "en-US",
		label: "English (United States)",
		fullLabel: "English (United States) · en-US",
	},
	{ value: "et-EE", label: "Estonian", fullLabel: "Estonian · et-EE" },
	{ value: "fo-FO", label: "Faroese", fullLabel: "Faroese · fo-FO" },
	{ value: "fil-PH", label: "Filipino", fullLabel: "Filipino · fil-PH" },
	{ value: "tl-PH", label: "Filipino", fullLabel: "Filipino · tl-PH" },
	{ value: "fi-FI", label: "Finnish", fullLabel: "Finnish · fi-FI" },
	{
		value: "fr-BE",
		label: "French (Belgium)",
		fullLabel: "French (Belgium) · fr-BE",
	},
	{
		value: "fr-CA",
		label: "French (Canada)",
		fullLabel: "French (Canada) · fr-CA",
	},
	{
		value: "fr-FR",
		label: "French (France)",
		fullLabel: "French (France) · fr-FR",
	},
	{
		value: "fr-CH",
		label: "French (Switzerland)",
		fullLabel: "French (Switzerland) · fr-CH",
	},
	{ value: "gl-ES", label: "Galician", fullLabel: "Galician · gl-ES" },
	{ value: "ka-GE", label: "Georgian", fullLabel: "Georgian · ka-GE" },
	{
		value: "de-AT",
		label: "German (Austria)",
		fullLabel: "German (Austria) · de-AT",
	},
	{
		value: "de-DE",
		label: "German (Germany)",
		fullLabel: "German (Germany) · de-DE",
	},
	{
		value: "de-CH",
		label: "German (Switzerland)",
		fullLabel: "German (Switzerland) · de-CH",
	},
	{ value: "el-GR", label: "Greek", fullLabel: "Greek · el-GR" },
	{ value: "gu-IN", label: "Gujarati", fullLabel: "Gujarati · gu-IN" },
	{
		value: "ht-HT",
		label: "Haitian Creole",
		fullLabel: "Haitian Creole · ht-HT",
	},
	{ value: "ha-NG", label: "Hausa", fullLabel: "Hausa · ha-NG" },
	{ value: "haw-US", label: "Hawaiian", fullLabel: "Hawaiian · haw-US" },
	{ value: "he-IL", label: "Hebrew", fullLabel: "Hebrew · he-IL" },
	{ value: "iw-IL", label: "Hebrew", fullLabel: "Hebrew · iw-IL" },
	{ value: "hi-IN", label: "Hindi", fullLabel: "Hindi · hi-IN" },
	{
		value: "hi-Latn",
		label: "Hindi (Latin)",
		fullLabel: "Hindi (Latin) · hi-Latn",
	},
	{ value: "hu-HU", label: "Hungarian", fullLabel: "Hungarian · hu-HU" },
	{ value: "is-IS", label: "Icelandic", fullLabel: "Icelandic · is-IS" },
	{ value: "id-ID", label: "Indonesian", fullLabel: "Indonesian · id-ID" },
	{ value: "ga-IE", label: "Irish", fullLabel: "Irish · ga-IE" },
	{
		value: "it-IT",
		label: "Italian (Italy)",
		fullLabel: "Italian (Italy) · it-IT",
	},
	{
		value: "it-CH",
		label: "Italian (Switzerland)",
		fullLabel: "Italian (Switzerland) · it-CH",
	},
	{ value: "ja-JP", label: "Japanese", fullLabel: "Japanese · ja-JP" },
	{ value: "jv-ID", label: "Javanese", fullLabel: "Javanese · jv-ID" },
	{ value: "kn-IN", label: "Kannada", fullLabel: "Kannada · kn-IN" },
	{ value: "kk-KZ", label: "Kazakh", fullLabel: "Kazakh · kk-KZ" },
	{ value: "km-KH", label: "Khmer", fullLabel: "Khmer · km-KH" },
	{ value: "ko-KR", label: "Korean", fullLabel: "Korean · ko-KR" },
	{ value: "lo-LA", label: "Lao", fullLabel: "Lao · lo-LA" },
	{ value: "lv-LV", label: "Latvian", fullLabel: "Latvian · lv-LV" },
	{ value: "ln-CD", label: "Lingala", fullLabel: "Lingala · ln-CD" },
	{ value: "lt-LT", label: "Lithuanian", fullLabel: "Lithuanian · lt-LT" },
	{
		value: "lb-LU",
		label: "Luxembourgish",
		fullLabel: "Luxembourgish · lb-LU",
	},
	{ value: "mk-MK", label: "Macedonian", fullLabel: "Macedonian · mk-MK" },
	{ value: "mg-MG", label: "Malagasy", fullLabel: "Malagasy · mg-MG" },
	{ value: "ms-MY", label: "Malay", fullLabel: "Malay · ms-MY" },
	{ value: "ml-IN", label: "Malayalam", fullLabel: "Malayalam · ml-IN" },
	{ value: "mt-MT", label: "Maltese", fullLabel: "Maltese · mt-MT" },
	{ value: "mr-IN", label: "Marathi", fullLabel: "Marathi · mr-IN" },
	{ value: "mn-MN", label: "Mongolian", fullLabel: "Mongolian · mn-MN" },
	{ value: "mi-NZ", label: "Maori", fullLabel: "Maori · mi-NZ" },
	{ value: "ne-NP", label: "Nepali", fullLabel: "Nepali · ne-NP" },
	{ value: "no-NO", label: "Norwegian", fullLabel: "Norwegian · no-NO" },
	{
		value: "nb-NO",
		label: "Norwegian Bokmal",
		fullLabel: "Norwegian Bokmal · nb-NO",
	},
	{
		value: "nn-NO",
		label: "Norwegian Nynorsk",
		fullLabel: "Norwegian Nynorsk · nn-NO",
	},
	{ value: "oc-FR", label: "Occitan", fullLabel: "Occitan · oc-FR" },
	{ value: "ps-AF", label: "Pashto", fullLabel: "Pashto · ps-AF" },
	{ value: "fa-IR", label: "Persian", fullLabel: "Persian · fa-IR" },
	{ value: "pl-PL", label: "Polish", fullLabel: "Polish · pl-PL" },
	{
		value: "pt-BR",
		label: "Portuguese (Brazil)",
		fullLabel: "Portuguese (Brazil) · pt-BR",
	},
	{
		value: "pt-PT",
		label: "Portuguese (Portugal)",
		fullLabel: "Portuguese (Portugal) · pt-PT",
	},
	{ value: "pa-Guru-IN", label: "Punjabi", fullLabel: "Punjabi · pa-Guru-IN" },
	{ value: "ro-RO", label: "Romanian", fullLabel: "Romanian · ro-RO" },
	{ value: "ru-RU", label: "Russian", fullLabel: "Russian · ru-RU" },
	{ value: "sa-IN", label: "Sanskrit", fullLabel: "Sanskrit · sa-IN" },
	{ value: "sr-RS", label: "Serbian", fullLabel: "Serbian · sr-RS" },
	{ value: "sn-ZW", label: "Shona", fullLabel: "Shona · sn-ZW" },
	{ value: "sd-PK", label: "Sindhi", fullLabel: "Sindhi · sd-PK" },
	{ value: "si-LK", label: "Sinhala", fullLabel: "Sinhala · si-LK" },
	{ value: "sk-SK", label: "Slovak", fullLabel: "Slovak · sk-SK" },
	{ value: "sl-SI", label: "Slovenian", fullLabel: "Slovenian · sl-SI" },
	{ value: "so-SO", label: "Somali", fullLabel: "Somali · so-SO" },
	{
		value: "es-AR",
		label: "Spanish (Argentina)",
		fullLabel: "Spanish (Argentina) · es-AR",
	},
	{
		value: "es-BO",
		label: "Spanish (Bolivia)",
		fullLabel: "Spanish (Bolivia) · es-BO",
	},
	{
		value: "es-CL",
		label: "Spanish (Chile)",
		fullLabel: "Spanish (Chile) · es-CL",
	},
	{
		value: "es-CO",
		label: "Spanish (Colombia)",
		fullLabel: "Spanish (Colombia) · es-CO",
	},
	{
		value: "es-CR",
		label: "Spanish (Costa Rica)",
		fullLabel: "Spanish (Costa Rica) · es-CR",
	},
	{
		value: "es-CU",
		label: "Spanish (Cuba)",
		fullLabel: "Spanish (Cuba) · es-CU",
	},
	{
		value: "es-DO",
		label: "Spanish (Dominican Republic)",
		fullLabel: "Spanish (Dominican Republic) · es-DO",
	},
	{
		value: "es-EC",
		label: "Spanish (Ecuador)",
		fullLabel: "Spanish (Ecuador) · es-EC",
	},
	{
		value: "es-SV",
		label: "Spanish (El Salvador)",
		fullLabel: "Spanish (El Salvador) · es-SV",
	},
	{
		value: "es-GQ",
		label: "Spanish (Equatorial Guinea)",
		fullLabel: "Spanish (Equatorial Guinea) · es-GQ",
	},
	{
		value: "es-GT",
		label: "Spanish (Guatemala)",
		fullLabel: "Spanish (Guatemala) · es-GT",
	},
	{
		value: "es-HN",
		label: "Spanish (Honduras)",
		fullLabel: "Spanish (Honduras) · es-HN",
	},
	{
		value: "es-419",
		label: "Spanish (Latin America)",
		fullLabel: "Spanish (Latin America) · es-419",
	},
	{
		value: "es-MX",
		label: "Spanish (Mexico)",
		fullLabel: "Spanish (Mexico) · es-MX",
	},
	{
		value: "es-NI",
		label: "Spanish (Nicaragua)",
		fullLabel: "Spanish (Nicaragua) · es-NI",
	},
	{
		value: "es-PA",
		label: "Spanish (Panama)",
		fullLabel: "Spanish (Panama) · es-PA",
	},
	{
		value: "es-PY",
		label: "Spanish (Paraguay)",
		fullLabel: "Spanish (Paraguay) · es-PY",
	},
	{
		value: "es-PE",
		label: "Spanish (Peru)",
		fullLabel: "Spanish (Peru) · es-PE",
	},
	{
		value: "es-PR",
		label: "Spanish (Puerto Rico)",
		fullLabel: "Spanish (Puerto Rico) · es-PR",
	},
	{
		value: "es-ES",
		label: "Spanish (Spain)",
		fullLabel: "Spanish (Spain) · es-ES",
	},
	{
		value: "es-US",
		label: "Spanish (United States)",
		fullLabel: "Spanish (United States) · es-US",
	},
	{
		value: "es-UY",
		label: "Spanish (Uruguay)",
		fullLabel: "Spanish (Uruguay) · es-UY",
	},
	{
		value: "es-VE",
		label: "Spanish (Venezuela)",
		fullLabel: "Spanish (Venezuela) · es-VE",
	},
	{ value: "su-ID", label: "Sundanese", fullLabel: "Sundanese · su-ID" },
	{
		value: "sw-KE",
		label: "Swahili (Kenya)",
		fullLabel: "Swahili (Kenya) · sw-KE",
	},
	{
		value: "sw-TZ",
		label: "Swahili (Tanzania)",
		fullLabel: "Swahili (Tanzania) · sw-TZ",
	},
	{ value: "sv-SE", label: "Swedish", fullLabel: "Swedish · sv-SE" },
	{ value: "tg-TJ", label: "Tajik", fullLabel: "Tajik · tg-TJ" },
	{
		value: "ta-IN",
		label: "Tamil (India)",
		fullLabel: "Tamil (India) · ta-IN",
	},
	{
		value: "ta-MY",
		label: "Tamil (Malaysia)",
		fullLabel: "Tamil (Malaysia) · ta-MY",
	},
	{
		value: "ta-SG",
		label: "Tamil (Singapore)",
		fullLabel: "Tamil (Singapore) · ta-SG",
	},
	{
		value: "ta-LK",
		label: "Tamil (Sri Lanka)",
		fullLabel: "Tamil (Sri Lanka) · ta-LK",
	},
	{ value: "tt-RU", label: "Tatar", fullLabel: "Tatar · tt-RU" },
	{ value: "te-IN", label: "Telugu", fullLabel: "Telugu · te-IN" },
	{ value: "th-TH", label: "Thai", fullLabel: "Thai · th-TH" },
	{ value: "bo-CN", label: "Tibetan", fullLabel: "Tibetan · bo-CN" },
	{ value: "tr-TR", label: "Turkish", fullLabel: "Turkish · tr-TR" },
	{ value: "tk-TM", label: "Turkmen", fullLabel: "Turkmen · tk-TM" },
	{ value: "uk-UA", label: "Ukrainian", fullLabel: "Ukrainian · uk-UA" },
	{ value: "ur-IN", label: "Urdu (India)", fullLabel: "Urdu (India) · ur-IN" },
	{
		value: "ur-PK",
		label: "Urdu (Pakistan)",
		fullLabel: "Urdu (Pakistan) · ur-PK",
	},
	{ value: "uz-UZ", label: "Uzbek", fullLabel: "Uzbek · uz-UZ" },
	{ value: "vi-VN", label: "Vietnamese", fullLabel: "Vietnamese · vi-VN" },
	{ value: "cy-GB", label: "Welsh", fullLabel: "Welsh · cy-GB" },
	{ value: "wo-SN", label: "Wolof", fullLabel: "Wolof · wo-SN" },
	{ value: "wuu-CN", label: "Wu Chinese", fullLabel: "Wu Chinese · wuu-CN" },
	{ value: "yo-NG", label: "Yoruba", fullLabel: "Yoruba · yo-NG" },
	{ value: "zu-ZA", label: "Zulu", fullLabel: "Zulu · zu-ZA" },
] as const satisfies readonly LanguageOption[];

export const MAX_SOURCE_LANGUAGES = 4;
export const MAX_TARGET_LANGUAGES = 10;
export const DEFAULT_SINGLE_SOURCE_LANGUAGE: LanguageCode = "zh-CN";
export const DEFAULT_MULTI_SOURCE_LANGUAGES: LanguageCode[] = [
	"zh-CN",
	"en-US",
];
export const DEFAULT_TARGET_LANGUAGES: LanguageCode[] = ["en-US"];

export type RoomLanguageSelection = {
	recognitionMode: RecognitionMode | "auto";
	sourceLanguages: string[];
	targetLanguages: string[];
};

export const resolveSourceLanguagesForRecognitionModeChange = ({
	sourceLanguages,
}: {
	currentMode: RecognitionMode | "auto";
	nextMode: RecognitionMode | "auto";
	sourceLanguages: LanguageCode[];
}): LanguageCode[] => {
	return uniqueSupportedLanguages(sourceLanguages);
};

export type ValidRoomLanguageSelection = {
	recognitionMode: RecognitionMode;
	sourceLanguages: LanguageCode[];
	targetLanguages: LanguageCode[];
	// When `recognitionMode === "auto"`, Shengwang auto-detects the source
	// language from the spoken audio. `sourceLanguages` is then the literal
	// sentinel ["auto"] and `targetLanguages` is the user's translation pick.
};

const supportedValues = new Set<string>(
	SUPPORTED_LANGUAGES.map((language) => language.value),
);

export const isSupportedLanguage = (value: string): value is LanguageCode =>
	supportedValues.has(value);

export const getLanguageLabel = (value: string) =>
	SUPPORTED_LANGUAGES.find((language) => language.value === value)?.label ??
	value;

const uniqueSupportedLanguages = (values: string[]) => {
	const seen = new Set<string>();
	const result: LanguageCode[] = [];

	for (const value of values) {
		if (!isSupportedLanguage(value) || seen.has(value)) {
			continue;
		}
		seen.add(value);
		result.push(value);
	}

	return result;
};

export const normalizeLanguageSelection = ({
	recognitionMode,
	sourceLanguages,
	targetLanguages,
}: RoomLanguageSelection): ValidRoomLanguageSelection => {
	if (recognitionMode === "auto") {
		const normalizedTargets = uniqueSupportedLanguages(targetLanguages).slice(
			0,
			MAX_TARGET_LANGUAGES,
		);
		const targetLanguagesWithFallback =
			normalizedTargets.length > 0
				? normalizedTargets
				: DEFAULT_TARGET_LANGUAGES;
		return {
			recognitionMode: "auto",
			sourceLanguages: [AUTO_LANGUAGE_TOKEN],
			targetLanguages: targetLanguagesWithFallback,
		};
	}

	const normalizedMode: RecognitionMode =
		recognitionMode === "multi" ? "multi" : "single";
	const normalizedSources =
		normalizedMode === "single"
			? uniqueSupportedLanguages(sourceLanguages).slice(0, 1)
			: uniqueSupportedLanguages(sourceLanguages).slice(
					0,
					MAX_SOURCE_LANGUAGES,
				);
	const sourceFallback =
		normalizedMode === "multi"
			? DEFAULT_MULTI_SOURCE_LANGUAGES
			: [DEFAULT_SINGLE_SOURCE_LANGUAGE];
	const sourceLanguagesWithFallback =
		normalizedSources.length > 0 ? normalizedSources : sourceFallback;
	const normalizedTargets = uniqueSupportedLanguages(targetLanguages).slice(
		0,
		MAX_TARGET_LANGUAGES,
	);
	const targetLanguagesWithFallback =
		normalizedTargets.length > 0 ? normalizedTargets : DEFAULT_TARGET_LANGUAGES;
	const targetLanguagesForMode =
		normalizedMode === "single"
			? targetLanguagesWithFallback.filter(
					(language) => language !== sourceLanguagesWithFallback[0],
				)
			: targetLanguagesWithFallback;

	return {
		recognitionMode: normalizedMode,
		sourceLanguages: sourceLanguagesWithFallback,
		targetLanguages: targetLanguagesForMode,
	};
};

export type LanguageValidationResult =
	| { ok: true; selection: ValidRoomLanguageSelection }
	| { ok: false; message: string };

export const validateLanguageSelection = (
	selection: RoomLanguageSelection,
): LanguageValidationResult => {
	if (
		selection.recognitionMode !== "single" &&
		selection.recognitionMode !== "multi" &&
		selection.recognitionMode !== "auto"
	) {
		return { ok: false, message: "Invalid recognition mode" };
	}
	if (selection.recognitionMode === "auto") {
		if (selection.targetLanguages.length < 1) {
			return { ok: false, message: "Select 1 to 10 target languages" };
		}
		if (selection.targetLanguages.length > MAX_TARGET_LANGUAGES) {
			return { ok: false, message: "Select 1 to 10 target languages" };
		}
		for (const language of selection.targetLanguages) {
			if (!isSupportedLanguage(language)) {
				return {
					ok: false,
					message: `Unsupported target language: ${language}`,
				};
			}
		}
		return { ok: true, selection: normalizeLanguageSelection(selection) };
	}
	if (selection.sourceLanguages.length < 1) {
		return { ok: false, message: "Select at least one source language" };
	}
	if (selection.targetLanguages.length < 1) {
		return { ok: false, message: "Select 1 to 10 target languages" };
	}
	if (selection.sourceLanguages.length > MAX_SOURCE_LANGUAGES) {
		return { ok: false, message: "Select at most 4 source languages" };
	}
	if (selection.targetLanguages.length > MAX_TARGET_LANGUAGES) {
		return { ok: false, message: "Select 1 to 10 target languages" };
	}
	for (const language of selection.sourceLanguages) {
		if (!isSupportedLanguage(language)) {
			return { ok: false, message: `Unsupported source language: ${language}` };
		}
	}
	for (const language of selection.targetLanguages) {
		if (!isSupportedLanguage(language)) {
			return { ok: false, message: `Unsupported target language: ${language}` };
		}
	}

	const normalized = normalizeLanguageSelection(selection);
	if (
		selection.recognitionMode === "single" &&
		normalized.sourceLanguages.length !== 1
	) {
		return {
			ok: false,
			message: "Single recognition requires one source language",
		};
	}
	if (
		selection.recognitionMode === "multi" &&
		(normalized.sourceLanguages.length < 1 ||
			normalized.sourceLanguages.length > MAX_SOURCE_LANGUAGES)
	) {
		return {
			ok: false,
			message: "Multi recognition requires 1 to 4 source languages",
		};
	}
	if (
		selection.recognitionMode === "single" &&
		selection.targetLanguages.includes(normalized.sourceLanguages[0])
	) {
		return {
			ok: false,
			message: "Target languages must not include the single source language",
		};
	}

	return { ok: true, selection: normalized };
};
