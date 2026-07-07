import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { buildLocaleSetCookieHeader, resolveRequestLocale } from "./server";
import type { ProductLocale } from "./types";

export const getInitialLocale = createServerFn({ method: "GET" }).handler(
	async () => {
		const request = getRequest();
		return resolveRequestLocale({ request });
	},
);

export const updateLocale = createServerFn({ method: "POST" })
	.inputValidator((data: { locale: ProductLocale }) => data)
	.handler(async ({ data }) => {
		setResponseHeader("Set-Cookie", buildLocaleSetCookieHeader(data.locale));
		return { locale: data.locale };
	});

