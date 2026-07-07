import { createFileRoute } from "@tanstack/react-router";
import {
	buildSsoLoginUrl,
	getServerSsoBaseUrl,
	getServerSsoCallbackRedirectUri,
	getServerSsoClientId,
	getServerSsoScope,
} from "#/lib/sso";

export const Route = createFileRoute("/api/sso/login")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const baseUrl = getServerSsoBaseUrl(process.env);
				const clientId = getServerSsoClientId(process.env);
				const scope = getServerSsoScope(process.env);

				if (!baseUrl) {
					return Response.json(
						{ code: 1, msg: "SSO_BASE_URL is not configured" },
						{ status: 400 },
					);
				}

				if (!clientId) {
					return Response.json(
						{ code: 1, msg: "SSO_CLIENT_ID is not configured" },
						{ status: 400 },
					);
				}

				if (!scope) {
					return Response.json(
						{ code: 1, msg: "SSO_SCOPE is not configured" },
						{ status: 400 },
					);
				}

				return Response.redirect(
					buildSsoLoginUrl({
						baseUrl,
						clientId,
						redirectUri: getServerSsoCallbackRedirectUri(request.url),
						scope,
					}),
					302,
				);
			},
		},
	},
});
