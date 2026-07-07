export const TOKEN_COOKIE_NAME_PREFIX = "stt-demo";
export const TOKEN_COOKIE_NAME_SUFFIX = "token";
export const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 3;
export const APP_ENVS = ["dev", "staging", "preprod", "prod"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

export const API_SSO_LOGIN = "/api/sso/login";
export const API_SSO_CALLBACK = "/api/sso/callback";
export const API_SSO_LOGOUT = "/api/sso/logout";
export const API_SSO_USER_INFO = "/api/sso/userInfo";
export const SSO_COMPANY_ID_WHITELIST_ENABLED = "SSO_COMPANY_ID_WHITELIST_ENABLED";
export const SSO_COMPANY_ID_WHITELIST = "SSO_COMPANY_ID_WHITELIST";

export const REMOTE_SSO_AUTHORIZE = "/api/v0/oauth/authorize";
export const REMOTE_SSO_TOKEN = "/api/v0/oauth/token";
export const REMOTE_USER_INFO = "/api/v0/customer/company/basic-info";

type EnvLike = Record<string, string | undefined>;

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

const getRequestOrigin = (requestUrl: string) => new URL(requestUrl).origin;

const isLoopbackHost = (hostname: string) =>
	hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

const pointsToLocalApp = (urlValue: string, requestUrl: string) => {
	const configuredUrl = new URL(urlValue);
	const request = new URL(requestUrl);

	return (
		configuredUrl.origin === request.origin ||
		(isLoopbackHost(configuredUrl.hostname) && isLoopbackHost(request.hostname))
	);
};

export const getServerSsoBaseUrl = (env: EnvLike = process.env) =>
	trimTrailingSlashes(env.SSO_BASE_URL ?? "");

const getRemoteSsoOpenBaseUrl = ({
	requestUrl,
	value,
}: {
	requestUrl?: string;
	value: string;
}) => {
	const baseUrl = trimTrailingSlashes(value);

	if (!baseUrl || !requestUrl) {
		return baseUrl;
	}

	try {
		if (pointsToLocalApp(baseUrl, requestUrl)) {
			return "";
		}
	} catch {
		return baseUrl;
	}

	return baseUrl;
};

export const getServerSsoOpenBaseUrl = (
	env: EnvLike = process.env,
	requestUrl?: string,
): string =>
	getRemoteSsoOpenBaseUrl({
		requestUrl,
		value: env.SSO_OPEN_API_BASE_URL ?? "",
	});

export const getServerSsoCallbackRedirectUri = (
	requestUrl: string,
	env: EnvLike = process.env,
): string => {
	const configuredRedirectUri = env.VITE_SSO_REDIRECT_URI;

	if (configuredRedirectUri && configuredRedirectUri.length > 0) {
		try {
			const redirectUrl = new URL(configuredRedirectUri);
			if (
				pointsToLocalApp(configuredRedirectUri, requestUrl) &&
				redirectUrl.pathname === "/"
			) {
				return `${getRequestOrigin(requestUrl)}${API_SSO_CALLBACK}`;
			}
		} catch {
			return configuredRedirectUri;
		}

		return configuredRedirectUri;
	}

	return `${getRequestOrigin(requestUrl)}${API_SSO_CALLBACK}`;
};

export const getServerSsoClientId = (env: EnvLike = process.env) =>
	env.SSO_CLIENT_ID ?? "";

export const getServerSsoClientSecret = (env: EnvLike = process.env) =>
	env.SSO_CLIENT_SECRET ?? "";

export const getServerSsoSessionSecret = (env: EnvLike = process.env) =>
	env.SSO_SESSION_SECRET ?? "";

export const getServerSsoCompanyIdWhitelistEnabled = (
	env: EnvLike = process.env,
) => {
	const value = (env[SSO_COMPANY_ID_WHITELIST_ENABLED] ?? "").trim().toLowerCase();
	return value === "1" || value === "true" || value === "yes" || value === "on";
};

export const getServerSsoCompanyIdWhitelist = (env: EnvLike = process.env) =>
	(env[SSO_COMPANY_ID_WHITELIST] ?? "")
		.split(",")
		.map((value) => value.trim())
		.filter((value) => value.length > 0)
		.map((value) => Number(value))
		.filter((value) => Number.isInteger(value) && value > 0);

export const getServerSsoScope = (env: EnvLike = process.env) =>
	env.SSO_SCOPE ?? "";

export const getServerAppEnv = (env: EnvLike = process.env): AppEnv => {
	const appEnv = (env.APP_ENV ?? env.ENVIRONMENT ?? "").trim();

	return APP_ENVS.find((value) => value === appEnv) ?? "dev";
};

export const buildSsoTokenUrl = ({ baseUrl }: { baseUrl: string }) =>
	`${trimTrailingSlashes(baseUrl)}${REMOTE_SSO_TOKEN}`;

export const buildSsoAuthorizeUrl = ({
	baseUrl,
	clientId,
	redirectUri,
	scope,
}: {
	baseUrl: string;
	clientId: string;
	redirectUri: string;
	scope: string;
}) => {
	const url = new URL(`${trimTrailingSlashes(baseUrl)}${REMOTE_SSO_AUTHORIZE}`);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("client_id", clientId);
	url.searchParams.set("scope", scope);
	url.searchParams.set("redirect_uri", redirectUri);
	return url.toString();
};

export const buildSsoLoginUrl = ({
	baseUrl,
	clientId,
	redirectUri,
	scope,
}: {
	baseUrl: string;
	clientId: string;
	redirectUri: string;
	scope: string;
}) => buildSsoAuthorizeUrl({ baseUrl, clientId, redirectUri, scope });

export const getServerSsoPostLogoutRedirectUri = (requestUrl: string): string =>
	`${getRequestOrigin(requestUrl)}/`;

export const buildLogoutUrl = ({
	baseUrl,
	redirectUri,
}: {
	baseUrl: string;
	redirectUri: string;
}) => {
	const url = new URL(`${trimTrailingSlashes(baseUrl)}/api/v0/logout`);
	url.searchParams.set("redirect_uri", redirectUri);
	return url.toString();
};
