import { createFileRoute } from "@tanstack/react-router";
import { getServerAuthSessionSecret } from "#/lib/auth/runtime";
import { createServerFetch } from "#/lib/server/http-log";
import {
	buildSsoTokenSetCookieHeader,
	buildSsoTokenUrl,
	getServerSsoBaseUrl,
	getServerSsoCallbackRedirectUri,
	getServerSsoClientId,
	getServerSsoClientSecret,
	getServerSsoOpenBaseUrl,
	parseRemoteResponse,
	parseTokenResponse,
	REMOTE_USER_INFO,
} from "#/lib/sso";
import { createAppSessionJwt } from "#/lib/sso/session";

export const Route = createFileRoute("/api/sso/callback")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const requestUrl = new URL(request.url);
				const code = requestUrl.searchParams.get("code");

				if (!code) {
					return Response.json(
						{ code: 1, msg: "Invalid request: missing code" },
						{ status: 400 },
					);
				}

				const baseUrl = getServerSsoBaseUrl(process.env);

				if (!baseUrl) {
					return Response.json(
						{ code: 1, msg: "SSO_BASE_URL is not configured" },
						{ status: 400 },
					);
				}

				const clientId = getServerSsoClientId(process.env);

				if (!clientId) {
					return Response.json(
						{ code: 1, msg: "SSO_CLIENT_ID is not configured" },
						{ status: 400 },
					);
				}

				const clientSecret = getServerSsoClientSecret(process.env);

				if (!clientSecret) {
					return Response.json(
						{ code: 1, msg: "SSO_CLIENT_SECRET is not configured" },
						{ status: 400 },
					);
				}

				const sessionSecret = getServerAuthSessionSecret(process.env);

				if (!sessionSecret) {
					return Response.json(
						{ code: 1, msg: "AUTH_SESSION_SECRET is not configured" },
						{ status: 400 },
					);
				}

				const formData = new URLSearchParams();
				formData.set("grant_type", "authorization_code");
				formData.set("client_id", clientId);
				formData.set("client_secret", clientSecret);
				formData.set("code", code);
				formData.set(
					"redirect_uri",
					getServerSsoCallbackRedirectUri(request.url),
				);

				try {
					const upstreamResponse = await createServerFetch(
						buildSsoTokenUrl({
							baseUrl,
						}),
						{
							method: "POST",
							headers: {
								"Content-Type": "application/x-www-form-urlencoded",
							},
							body: formData,
						},
					);
					const upstreamData = await upstreamResponse.json();

					if (!upstreamResponse.ok) {
						return Response.json(upstreamData, {
							status: upstreamResponse.status,
						});
					}

					const parsed = parseTokenResponse(upstreamData);
					const userInfoBaseUrl = getServerSsoOpenBaseUrl(
						process.env,
						request.url,
					);

					if (!userInfoBaseUrl) {
						return Response.json(
							{ code: 1, msg: "SSO_OPEN_API_BASE_URL is not configured" },
							{ status: 400 },
						);
					}

					const userInfoResponse = await createServerFetch(
						`${userInfoBaseUrl}${REMOTE_USER_INFO}`,
						{
							method: "GET",
							headers: {
								Authorization: `Bearer ${parsed.accessToken}`,
							},
						},
					);
					const userInfoData = await userInfoResponse.json();

					if (!userInfoResponse.ok) {
						return Response.json(userInfoData, {
							status: userInfoResponse.status,
						});
					}

					const userInfo = parseRemoteResponse(userInfoData);
					const appSessionToken = createAppSessionJwt({
						secret: sessionSecret,
						userInfo: userInfo.data ?? userInfoData,
					});
					const redirectUrl = new URL(
						"/app",
						getServerSsoCallbackRedirectUri(request.url),
					);

					return new Response(null, {
						status: 302,
						headers: {
							Location: redirectUrl.toString(),
							"Set-Cookie": buildSsoTokenSetCookieHeader(appSessionToken),
						},
					});
				} catch (error) {
					return Response.json(
						{
							code: 1,
							msg:
								error instanceof Error
									? error.message
									: "Invalid SSO callback request",
						},
						{ status: 400 },
					);
				}
			},
		},
	},
});
