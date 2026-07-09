import { createFileRoute } from "@tanstack/react-router";
import { getServerAuthSessionSecret } from "#/lib/auth/runtime";
import { ERROR_CODES } from "#/lib/i18n";
import {
	buildSsoTokenClearCookieHeader,
	getSsoTokenCookieFromRequest,
} from "#/lib/sso";
import { verifyAppSessionJwt } from "#/lib/sso/session";

export const Route = createFileRoute("/api/sso/userInfo")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const token = getSsoTokenCookieFromRequest(request);

				if (!token) {
					return Response.json(
						{
							code: 1,
							errorCode: ERROR_CODES.SESSION_MISSING,
							msg: "Session cookie missing",
						},
						{ status: 401 },
					);
				}

				const sessionSecret = getServerAuthSessionSecret(process.env);

				if (!sessionSecret) {
					return Response.json(
						{
							code: 1,
							errorCode: ERROR_CODES.SESSION_MISSING,
							msg: "AUTH_SESSION_SECRET is not configured",
						},
						{
							status: 401,
							headers: {
								"Set-Cookie": buildSsoTokenClearCookieHeader(),
							},
						},
					);
				}

				try {
					const appSession = verifyAppSessionJwt({
						secret: sessionSecret,
						token,
					});

					if (!appSession) {
						return Response.json(
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
					}

					return Response.json({ code: 0, data: appSession.userInfo });
				} catch (error) {
					return Response.json(
						{
							code: 1,
							msg:
								error instanceof Error
									? error.message
									: "Invalid SSO user info request",
						},
						{ status: 400 },
					);
				}
			},
		},
	},
});
