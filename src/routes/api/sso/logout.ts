import { createFileRoute } from "@tanstack/react-router";
import {
	buildLogoutUrl,
	buildSsoTokenClearCookieHeader,
	getServerSsoBaseUrl,
	getServerSsoPostLogoutRedirectUri,
} from "#/lib/sso";

export const Route = createFileRoute("/api/sso/logout")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const baseUrl = getServerSsoBaseUrl(process.env);
				const clearCookie = buildSsoTokenClearCookieHeader();

				if (!baseUrl) {
					return Response.json(
						{ code: 1, msg: "SSO_BASE_URL is not configured" },
						{
							status: 400,
							headers: {
								"Set-Cookie": clearCookie,
							},
						},
					);
				}

				return new Response(null, {
					status: 302,
					headers: {
						Location: buildLogoutUrl({
							baseUrl,
							redirectUri: getServerSsoPostLogoutRedirectUri(
								request.url,
								process.env,
							),
						}),
						"Set-Cookie": clearCookie,
					},
				});
			},
		},
	},
});
