import { ERROR_CODES } from "#/lib/i18n";
import {
	getServerSsoCompanyIdWhitelist,
	getServerSsoCompanyIdWhitelistEnabled,
} from "#/lib/sso/constants";
import {
	buildSsoTokenClearCookieHeader,
	getSsoTokenCookieFromRequest,
} from "#/lib/sso/server";
import { type AppSessionPayload, verifyAppSessionJwt } from "#/lib/sso/session";
import {
	type AuthRuntime,
	getServerAuthSessionSecret,
	hasAuthSessionSecret,
	resolveAuthRuntime,
} from "./runtime";
import {
	buildGuestTokenClearCookieHeader,
	getGuestTokenCookieFromRequest,
} from "./server";
import { createSsoIdentity, verifyGuestSessionJwt } from "./session";
import type { AppIdentity } from "./types";

export const API_AUTH_EXEMPT_PATHS = new Set([
	"/api/auth/session",
	"/api/auth/logout",
	"/api/sso/login",
	"/api/sso/callback",
	"/api/sso/logout",
	"/api/sso/userInfo",
	"/api/mobile-viewer/session",
	"/api/mobile-viewer/rtm-token",
]);

export const isApiRequestPath = (pathname: string) =>
	pathname.startsWith("/api/");

export const isExemptFromAuth = (pathname: string) =>
	API_AUTH_EXEMPT_PATHS.has(pathname);

const buildSessionMissingResponse = () =>
	Response.json(
		{
			code: 1,
			errorCode: ERROR_CODES.SESSION_MISSING,
			msg: "Session cookie missing",
		},
		{ status: 401 },
	);

const buildSessionExpiredResponse = (clearCookieHeader: string) =>
	Response.json(
		{
			code: 1,
			errorCode: ERROR_CODES.SESSION_EXPIRED,
			msg: "Session expired",
		},
		{
			status: 401,
			headers: {
				"Set-Cookie": clearCookieHeader,
			},
		},
	);

export const buildAuthConfigIncompleteResponse = ({
	runtime,
	message = "Auth config is incomplete",
	status = 500,
}: {
	runtime?: AuthRuntime;
	message?: string;
	status?: number;
} = {}) =>
	Response.json(
		{
			code: 1,
			errorCode: ERROR_CODES.AUTH_CONFIG_INCOMPLETE,
			msg: message,
			...(runtime?.kind === "misconfigured"
				? {
						missingKeys: runtime.missingKeys,
						configuredKeys: runtime.configuredKeys,
					}
				: {}),
		},
		{ status },
	);

const buildCompanyNotAllowedResponse = () =>
	Response.json(
		{
			code: 1,
			errorCode: ERROR_CODES.UNKNOWN,
			msg: "Company is not allowed",
		},
		{ status: 403 },
	);

const getSessionCompanyId = (session: AppSessionPayload) => {
	const userInfo = session.userInfo;
	if (typeof userInfo !== "object" || userInfo === null) {
		return null;
	}

	const companyId = (userInfo as Record<string, unknown>).companyId;
	return typeof companyId === "number" &&
		Number.isInteger(companyId) &&
		companyId > 0
		? companyId
		: null;
};

export const validateSsoAuthRequest = (
	request: Request,
):
	| { ok: true; identity: AppIdentity; session: AppSessionPayload }
	| { ok: false; response: Response } => {
	const token = getSsoTokenCookieFromRequest(request);

	if (!token) {
		return { ok: false, response: buildSessionMissingResponse() };
	}

	const sessionSecret = getServerAuthSessionSecret(process.env);
	if (!sessionSecret) {
		return {
			ok: false,
			response: buildAuthConfigIncompleteResponse({
				message: "AUTH_SESSION_SECRET is not configured",
			}),
		};
	}

	try {
		const appSession = verifyAppSessionJwt({
			secret: sessionSecret,
			token,
		});

		if (!appSession) {
			return {
				ok: false,
				response: buildSessionExpiredResponse(buildSsoTokenClearCookieHeader()),
			};
		}

		const companyIdWhitelistEnabled = getServerSsoCompanyIdWhitelistEnabled(
			process.env,
		);
		const companyIdWhitelist = getServerSsoCompanyIdWhitelist(process.env);
		if (companyIdWhitelistEnabled) {
			const companyId = getSessionCompanyId(appSession);
			if (!companyId || !companyIdWhitelist.includes(companyId)) {
				return {
					ok: false,
					response: buildCompanyNotAllowedResponse(),
				};
			}
		}

		return {
			ok: true,
			identity: createSsoIdentity(appSession.userInfo),
			session: appSession,
		};
	} catch (error) {
		return {
			ok: false,
			response: Response.json(
				{
					code: 1,
					msg:
						error instanceof Error
							? error.message
							: "Invalid SSO session request",
				},
				{ status: 400 },
			),
		};
	}
};

export const validateGuestAuthRequest = (
	request: Request,
): { ok: true; identity: AppIdentity } | { ok: false; response: Response } => {
	const token = getGuestTokenCookieFromRequest(request);

	if (!token) {
		return { ok: false, response: buildSessionMissingResponse() };
	}

	const sessionSecret = getServerAuthSessionSecret(process.env);
	if (!sessionSecret) {
		return {
			ok: false,
			response: buildAuthConfigIncompleteResponse({
				message: "AUTH_SESSION_SECRET is not configured",
			}),
		};
	}

	try {
		const identity = verifyGuestSessionJwt({
			secret: sessionSecret,
			token,
		});

		if (!identity) {
			return {
				ok: false,
				response: buildSessionExpiredResponse(
					buildGuestTokenClearCookieHeader(),
				),
			};
		}

		return { ok: true, identity };
	} catch (error) {
		return {
			ok: false,
			response: Response.json(
				{
					code: 1,
					msg:
						error instanceof Error
							? error.message
							: "Invalid guest session request",
				},
				{ status: 400 },
			),
		};
	}
};

export const validateAuthRequest = (
	request: Request,
): { ok: true; identity: AppIdentity } | { ok: false; response: Response } => {
	const runtime = resolveAuthRuntime(process.env);
	if (runtime.kind === "misconfigured") {
		return {
			ok: false,
			response: buildAuthConfigIncompleteResponse({
				runtime,
				message: "SSO config is incomplete",
			}),
		};
	}

	if (!hasAuthSessionSecret(process.env)) {
		return {
			ok: false,
			response: buildAuthConfigIncompleteResponse({
				message: "AUTH_SESSION_SECRET is not configured",
			}),
		};
	}

	return runtime.kind === "sso"
		? validateSsoAuthRequest(request)
		: validateGuestAuthRequest(request);
};

export const enforceApiAuth = (request: Request) => {
	const { pathname } = new URL(request.url);

	if (!isApiRequestPath(pathname) || isExemptFromAuth(pathname)) {
		return null;
	}

	const result = validateAuthRequest(request);
	return result.ok ? null : result.response;
};
