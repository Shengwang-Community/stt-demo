import * as React from "react";
import { getMessages } from "./catalog";
import type { MessageTree, ProductLocale, TranslationValue } from "./types";

type LocaleContextValue = {
	locale: ProductLocale;
	setLocale: (locale: ProductLocale) => void;
};

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

const resolveMessage = (
	tree: MessageTree,
	key: string,
): TranslationValue | undefined => {
	const parts = key.split(".");
	let current: MessageTree | TranslationValue | undefined = tree;

	for (const part of parts) {
		if (!current || typeof current === "string" || typeof current === "function") {
			return undefined;
		}
		current = current[part];
	}

	return current as TranslationValue | undefined;
};

const interpolate = (
	value: string,
	params?: Record<string, string | number>,
) => {
	if (!params) {
		return value;
	}

	return value.replace(/\{(\w+)\}/g, (_, key: string) => {
		const replacement = params[key];
		return replacement === undefined ? `{${key}}` : String(replacement);
	});
};

export function LocaleProvider({
	initialLocale,
	children,
}: {
	initialLocale: ProductLocale;
	children: React.ReactNode;
}) {
	const [locale, setLocale] = React.useState(initialLocale);

	const value = React.useMemo(
		() => ({
			locale,
			setLocale,
		}),
		[locale],
	);

	return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => {
	const context = React.useContext(LocaleContext);
	if (!context) {
		throw new Error("LocaleProvider is missing");
	}
	return context;
};

export const useT = () => {
	const { locale } = useLocale();
	const messages = getMessages(locale);

	return React.useCallback(
		(key: string, params?: Record<string, string | number>) => {
			const value = resolveMessage(messages, key);
			if (typeof value === "function") {
				return value(params);
			}
			if (typeof value === "string") {
				return interpolate(value, params);
			}
			return key;
		},
		[messages],
	);
};

