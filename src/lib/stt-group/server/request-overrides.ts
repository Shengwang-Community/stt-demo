import {
	type AgoraRuntimeConfig,
	type AgoraServerConfig,
	type EnvLike,
	getAgoraServerConfig,
	getRtcAgoraTokenConfig,
} from "./env";

export type ResolvedDeveloperOverrides = {
	customAppId?: string;
	requestBaseUrl?: string;
	xServiceNamespace?: string;
};

const APP_ID_PATTERN = /^[A-Za-z0-9]+$/;
const HEADER_VALUE_PATTERN = /^[A-Za-z0-9._-]+$/;

const assertAppId = (value: string) => {
	if (!APP_ID_PATTERN.test(value)) {
		throw new Error("Invalid developer override: customAppId");
	}

	return value;
};

const normalizeBaseUrl = (value: string) => {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error("Invalid developer override: requestBaseUrl");
	}

	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new Error("Invalid developer override: requestBaseUrl");
	}

	return url.toString().replace(/\/+$/, "");
};

const assertHeaderValue = (value: string) => {
	if (!HEADER_VALUE_PATTERN.test(value)) {
		throw new Error("Invalid developer override: xServiceNamespace");
	}

	return value;
};

export const parseDeveloperOverrides = (
	input: unknown,
): ResolvedDeveloperOverrides => {
	if (typeof input !== "object" || input === null) {
		return {};
	}

	const record = input as Record<string, unknown>;
	if (record.applied !== true) {
		return {};
	}

	const overrides: ResolvedDeveloperOverrides = {};

	if (typeof record.customAppId === "string" && record.customAppId.trim()) {
		overrides.customAppId = assertAppId(record.customAppId.trim());
	}

	if (
		typeof record.requestBaseUrl === "string" &&
		record.requestBaseUrl.trim()
	) {
		overrides.requestBaseUrl = normalizeBaseUrl(record.requestBaseUrl.trim());
	}

	if (
		typeof record.xServiceNamespace === "string" &&
		record.xServiceNamespace.trim()
	) {
		overrides.xServiceNamespace = assertHeaderValue(
			record.xServiceNamespace.trim(),
		);
	}

	return overrides;
};

export const buildRtcTokenConfigWithOverrides = (
	env: EnvLike,
	overrides: ResolvedDeveloperOverrides,
): AgoraRuntimeConfig => {
	const config = getRtcAgoraTokenConfig(env);

	if (!overrides.customAppId) {
		return config;
	}

	return {
		...config,
		appId: overrides.customAppId,
	};
};

export const buildSttServerConfigWithOverrides = (
	env: EnvLike,
	overrides: ResolvedDeveloperOverrides,
): AgoraServerConfig => {
	const config = getAgoraServerConfig(env);
	const appId = overrides.customAppId ?? config.appId;

	return {
		...config,
		appId,
		sttRestAuthKey: env.AGORA_CUSTOMER_KEY || appId,
		sttRestAuthSecret: env.AGORA_CUSTOMER_SECRET || config.appCertificate,
		sttRestBaseUrl: overrides.requestBaseUrl ?? config.sttRestBaseUrl,
		requestHeaders: overrides.xServiceNamespace
			? {
					"X-Service-Namespace": overrides.xServiceNamespace,
				}
			: {},
	};
};
