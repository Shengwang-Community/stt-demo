import {
	getServerAppEnv,
	TOKEN_COOKIE_NAME_PREFIX,
	TOKEN_COOKIE_NAME_SUFFIX,
	TOKEN_MAX_AGE_SECONDS,
} from "./constants";

type EnvLike = Record<string, string | undefined>;

export const getSsoTokenCookieName = (env: EnvLike = process.env) =>
	[
		TOKEN_COOKIE_NAME_PREFIX,
		getServerAppEnv(env),
		TOKEN_COOKIE_NAME_SUFFIX,
	].join("-");

export const buildSsoTokenSetCookieHeader = (token: string, env?: EnvLike) =>
	`${getSsoTokenCookieName(env)}=${encodeURIComponent(
		token,
	)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TOKEN_MAX_AGE_SECONDS}`;

export const buildSsoTokenClearCookieHeader = (env?: EnvLike) =>
	`${getSsoTokenCookieName(env)}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

export const getSsoTokenCookieFromRequest = (
	request: Request,
	env?: EnvLike,
) => {
	const cookieHeader = request.headers.get("Cookie");
	if (!cookieHeader) {
		return null;
	}

	const cookieName = getSsoTokenCookieName(env);
	const tokenCookie = cookieHeader
		.split(";")
		.map((item) => item.trim())
		.find((item) => item.startsWith(`${cookieName}=`));

	if (!tokenCookie) {
		return null;
	}

	const token = decodeURIComponent(tokenCookie.slice(cookieName.length + 1));

	return token.length > 0 ? token : null;
};
