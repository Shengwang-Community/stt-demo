import {
	DEFAULT_FALLBACK_LOCALE,
	isProductLocale,
	LOCALE_COOKIE_NAME,
	resolveEnvironmentDefaultLocale,
} from "./locale";
import type { ProductLocale } from "./types";

type EnvLike = Record<string, string | undefined>;

export const getLocaleCookieFromRequest = (request: Request) => {
	const cookieHeader = request.headers.get("Cookie");
	if (!cookieHeader) {
		return null;
	}

	const localeCookie = cookieHeader
		.split(";")
		.map((item) => item.trim())
		.find((item) => item.startsWith(`${LOCALE_COOKIE_NAME}=`));

	if (!localeCookie) {
		return null;
	}

	const value = decodeURIComponent(
		localeCookie.slice(LOCALE_COOKIE_NAME.length + 1),
	);
	return isProductLocale(value) ? value : null;
};

export const buildLocaleSetCookieHeader = (locale: ProductLocale) =>
	`${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;

export const resolveRequestLocale = ({
	request,
	env = process.env,
}: {
	request: Request;
	env?: EnvLike;
}): ProductLocale =>
	getLocaleCookieFromRequest(request) ??
	resolveEnvironmentDefaultLocale(env.VITE_LOCALE) ??
	DEFAULT_FALLBACK_LOCALE;

