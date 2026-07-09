export const API_AUTH_SESSION = "/api/auth/session";
export const API_AUTH_LOGOUT = "/api/auth/logout";
export const AUTH_SESSION_SECRET = "AUTH_SESSION_SECRET";

export const SSO_PROVIDER_CONFIG_KEYS = [
	"SSO_BASE_URL",
	"SSO_CLIENT_ID",
	"SSO_CLIENT_SECRET",
	"SSO_OPEN_API_BASE_URL",
	"SSO_SCOPE",
] as const;

type EnvLike = Record<string, string | undefined>;

export type SsoProviderConfigKey = (typeof SSO_PROVIDER_CONFIG_KEYS)[number];

export type AuthRuntime =
	| { kind: "sso" }
	| { kind: "guest" }
	| {
			kind: "misconfigured";
			missingKeys: SsoProviderConfigKey[];
			configuredKeys: SsoProviderConfigKey[];
	  };

const hasConfigValue = (value: string | undefined) =>
	typeof value === "string" && value.trim().length > 0;

export const resolveAuthRuntime = (env: EnvLike = process.env): AuthRuntime => {
	const configuredKeys = SSO_PROVIDER_CONFIG_KEYS.filter((key) =>
		hasConfigValue(env[key]),
	);

	if (configuredKeys.length === 0) {
		return { kind: "guest" };
	}

	if (configuredKeys.length === SSO_PROVIDER_CONFIG_KEYS.length) {
		return { kind: "sso" };
	}

	return {
		kind: "misconfigured",
		configuredKeys,
		missingKeys: SSO_PROVIDER_CONFIG_KEYS.filter(
			(key) => !configuredKeys.includes(key),
		),
	};
};

export const getServerAuthSessionSecret = (env: EnvLike = process.env) =>
	env[AUTH_SESSION_SECRET] ?? "";

export const hasAuthSessionSecret = (env: EnvLike = process.env) =>
	hasConfigValue(getServerAuthSessionSecret(env));
