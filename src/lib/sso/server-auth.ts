import { ERROR_CODES } from "#/lib/i18n";
import {
	getServerSsoCompanyIdWhitelist,
	getServerSsoCompanyIdWhitelistEnabled,
	getServerSsoSessionSecret,
} from "./constants";
import {
	buildSsoTokenClearCookieHeader,
	getSsoTokenCookieFromRequest,
} from "./server";
import { verifyAppSessionJwt, type AppSessionPayload } from "./session";

export const API_SSO_AUTH_EXEMPT_PATHS = new Set([
	"/api/sso/login", // OAuth entrypoint must remain anonymously reachable.
	"/api/sso/callback", // OAuth callback must remain anonymously reachable.
	"/api/sso/logout", // Logout should clear local state even if the session is missing.
	"/api/sso/userInfo", // Session probe endpoint must keep its route-specific auth semantics.
	"/api/mobile-viewer/session", // Mobile viewers authenticate with viewerToken, not SSO.
]);

export const isApiRequestPath = (pathname: string) => pathname.startsWith("/api/");

export const isExemptFromSsoAuth = (pathname: string) =>
	API_SSO_AUTH_EXEMPT_PATHS.has(pathname);

const buildSessionMissingResponse = () =>
	Response.json(
		{
			code: 1,
			errorCode: ERROR_CODES.SESSION_MISSING,
			msg: "Session cookie missing",
		},
		{ status: 401 },
	);

const buildSessionExpiredResponse = () =>
	Response.json(
		{
			code: 1,
			errorCode: ERROR_CODES.SESSION_EXPIRED,
			msg: "Session expired",
		},
		{
			status: 401,
			headers: {
				"Set-Cookie": buildSsoTokenClearCookieHeader(),
			},
		},
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
	return typeof companyId === "number" && Number.isInteger(companyId) && companyId > 0
		? companyId
		: null;
};

export const validateSsoSessionRequest = (
	request: Request,
): { ok: true; session: AppSessionPayload } | { ok: false; response: Response } => {
	const token = getSsoTokenCookieFromRequest(request);

	if (!token) {
		return {
			ok: false,
			response: buildSessionMissingResponse(),
		};
	}

	const sessionSecret = getServerSsoSessionSecret(process.env);

	if (!sessionSecret) {
		return {
			ok: false,
			response: Response.json(
				{ code: 1, msg: "SSO_SESSION_SECRET is not configured" },
				{ status: 400 },
			),
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
				response: buildSessionExpiredResponse(),
			};
		}

		const companyIdWhitelistEnabled =
			getServerSsoCompanyIdWhitelistEnabled(process.env);
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

		return { ok: true, session: appSession };
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

export const enforceApiSsoAuth = (request: Request) => {
	const { pathname } = new URL(request.url);

	if (!isApiRequestPath(pathname) || isExemptFromSsoAuth(pathname)) {
		return null;
	}

	const result = validateSsoSessionRequest(request);
	return result.ok ? null : result.response;
};
