import { PRODUCT_LOCALES, type ProductLocale } from "./types";

export const LOCALE_COOKIE_NAME = "stt-demo-locale";
export const DEFAULT_FALLBACK_LOCALE: ProductLocale = "en-US";

export const isProductLocale = (value: string): value is ProductLocale =>
	PRODUCT_LOCALES.includes(value as ProductLocale);

export const resolveEnvironmentDefaultLocale = (
	value: string | undefined,
): ProductLocale => {
	if (value && isProductLocale(value)) {
		return value;
	}

	return DEFAULT_FALLBACK_LOCALE;
};

