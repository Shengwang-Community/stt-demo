export const PRODUCT_LOCALES = ["zh-CN", "en-US"] as const;

export type ProductLocale = (typeof PRODUCT_LOCALES)[number];

export type TranslationValue =
	| string
	| ((params?: Record<string, string | number>) => string);

export type MessageTree = {
	[key: string]: MessageTree | TranslationValue;
};

