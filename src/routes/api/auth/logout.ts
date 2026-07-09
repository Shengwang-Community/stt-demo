import { createFileRoute } from "@tanstack/react-router";
import { resolveAuthRuntime } from "#/lib/auth/runtime";
import { buildGuestTokenClearCookieHeader } from "#/lib/auth/server";
import { buildAuthConfigIncompleteResponse } from "#/lib/auth/server-auth";
import {
	buildLogoutUrl,
	buildSsoTokenClearCookieHeader,
	getServerSsoBaseUrl,
	getServerSsoPostLogoutRedirectUri,
} from "#/lib/sso";

export const Route = createFileRoute("/api/auth/logout")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const runtime = resolveAuthRuntime(process.env);
				const localRedirectUrl = new URL("/", request.url);

				if (runtime.kind === "misconfigured") {
					return buildAuthConfigIncompleteResponse({
						runtime,
						message: "SSO config is incomplete",
					});
				}

				if (runtime.kind === "guest") {
					return new Response(null, {
						status: 302,
						headers: {
							Location: localRedirectUrl.toString(),
							"Set-Cookie": buildGuestTokenClearCookieHeader(),
						},
					});
				}

				const baseUrl = getServerSsoBaseUrl(process.env);
				if (!baseUrl) {
					return new Response(null, {
						status: 302,
						headers: {
							Location: localRedirectUrl.toString(),
							"Set-Cookie": buildSsoTokenClearCookieHeader(),
						},
					});
				}

				return new Response(null, {
					status: 302,
					headers: {
						Location: buildLogoutUrl({
							baseUrl,
							redirectUri: getServerSsoPostLogoutRedirectUri(request.url),
						}),
						"Set-Cookie": buildSsoTokenClearCookieHeader(),
					},
				});
			},
		},
	},
});
