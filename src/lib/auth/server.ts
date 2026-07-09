import {
	getServerAppEnv,
	TOKEN_COOKIE_NAME_PREFIX,
	TOKEN_COOKIE_NAME_SUFFIX,
	TOKEN_MAX_AGE_SECONDS,
} from "#/lib/sso/constants";

type EnvLike = Record<string, string | undefined>;

const GUEST_TOKEN_COOKIE_NAME_PART = "guest";

export const getGuestTokenCookieName = (env: EnvLike = process.env) =>
	[
		TOKEN_COOKIE_NAME_PREFIX,
		getServerAppEnv(env),
		GUEST_TOKEN_COOKIE_NAME_PART,
		TOKEN_COOKIE_NAME_SUFFIX,
	].join("-");

const buildCookieHeader = ({
	name,
	value,
	maxAge,
}: {
	name: string;
	value: string;
	maxAge: number;
}) =>
	`${name}=${encodeURIComponent(
		value,
	)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;

export const buildGuestTokenSetCookieHeader = (token: string, env?: EnvLike) =>
	buildCookieHeader({
		name: getGuestTokenCookieName(env),
		value: token,
		maxAge: TOKEN_MAX_AGE_SECONDS,
	});

export const buildGuestTokenClearCookieHeader = (env?: EnvLike) =>
	buildCookieHeader({
		name: getGuestTokenCookieName(env),
		value: "",
		maxAge: 0,
	});

export const getCookieValueFromRequest = ({
	request,
	cookieName,
}: {
	request: Request;
	cookieName: string;
}) => {
	const cookieHeader = request.headers.get("Cookie");
	if (!cookieHeader) {
		return null;
	}

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

export const getGuestTokenCookieFromRequest = (
	request: Request,
	env?: EnvLike,
) =>
	getCookieValueFromRequest({
		request,
		cookieName: getGuestTokenCookieName(env),
	});
