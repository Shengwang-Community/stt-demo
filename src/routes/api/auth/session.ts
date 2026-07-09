import { createFileRoute } from "@tanstack/react-router";
import {
	getServerAuthSessionSecret,
	resolveAuthRuntime,
} from "#/lib/auth/runtime";
import {
	buildGuestTokenSetCookieHeader,
	getGuestTokenCookieFromRequest,
} from "#/lib/auth/server";
import {
	buildAuthConfigIncompleteResponse,
	validateSsoAuthRequest,
} from "#/lib/auth/server-auth";
import {
	createGuestIdentity,
	createGuestSessionJwt,
	verifyGuestSessionJwt,
} from "#/lib/auth/session";

export const Route = createFileRoute("/api/auth/session")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const runtime = resolveAuthRuntime(process.env);

				if (runtime.kind === "misconfigured") {
					return buildAuthConfigIncompleteResponse({
						runtime,
						message: "SSO config is incomplete",
					});
				}

				const sessionSecret = getServerAuthSessionSecret(process.env);
				if (!sessionSecret) {
					return buildAuthConfigIncompleteResponse({
						message: "AUTH_SESSION_SECRET is not configured",
					});
				}

				if (runtime.kind === "sso") {
					const result = validateSsoAuthRequest(request);
					return result.ok
						? Response.json({ code: 0, data: result.identity })
						: result.response;
				}

				const token = getGuestTokenCookieFromRequest(request);
				if (token) {
					const identity = verifyGuestSessionJwt({
						secret: sessionSecret,
						token,
					});
					if (identity) {
						return Response.json({ code: 0, data: identity });
					}
				}

				const identity = createGuestIdentity();
				const nextToken = createGuestSessionJwt({
					secret: sessionSecret,
					identity,
				});

				return Response.json(
					{ code: 0, data: identity },
					{
						headers: {
							"Set-Cookie": buildGuestTokenSetCookieHeader(nextToken),
						},
					},
				);
			},
		},
	},
});
