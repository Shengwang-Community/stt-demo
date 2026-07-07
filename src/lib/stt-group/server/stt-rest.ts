import { createServerFetch } from "#/lib/server/http-log";
import {
	createSessionId,
	isValidChannelName,
	type SttSessionStartRequest,
	type SttSessionStartResponse,
} from "../domain";
import { validateLanguageSelection } from "../languages";
import {
	buildCaptionFileNamePrefixList,
	mapCaptionProviderToShengwangVendor,
} from "./caption-storage";
import type { AgoraServerConfig } from "./env";
import { getAgoraServerConfig } from "./env";
import { createRtcToken } from "./tokens";

export type ShengwangJoinResponse = {
	agent_id: string;
	create_ts: number | null;
	status: string;
};

export type ShengwangAgentStatusResponse = {
	agent_id?: string;
	create_ts?: number | null;
	status?: string;
	[key: string]: unknown;
};

const basicAuthHeader = ({
	sttRestBasicAuth,
	sttRestAuthKey,
	sttRestAuthSecret,
}: {
	sttRestBasicAuth?: string;
	sttRestAuthKey: string;
	sttRestAuthSecret: string;
}) => {
	if (sttRestBasicAuth) {
		return sttRestBasicAuth.startsWith("Basic ")
			? sttRestBasicAuth
			: `Basic ${sttRestBasicAuth}`;
	}

	return `Basic ${Buffer.from(
		`${sttRestAuthKey}:${sttRestAuthSecret}`,
	).toString("base64")}`;
};

const parseJsonObject = (text: string) => {
	if (!text) {
		return {};
	}

	try {
		const data = JSON.parse(text);
		return data && typeof data === "object"
			? (data as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
};

const formatShengwangError = (
	data: Record<string, unknown>,
	status: number,
) => {
	const reason = typeof data.reason === "string" ? data.reason : undefined;
	const message =
		typeof data.message === "string"
			? data.message
			: typeof data.msg === "string"
				? data.msg
				: typeof data.detail === "string"
					? data.detail
					: undefined;

	if (reason === "ServiceNotEnabled") {
		return "当前声网项目未开通实时转写服务（ServiceNotEnabled），请在声网控制台为该 App ID 开通 STT 服务后重试。";
	}

	return message ?? `Shengwang STT request failed with ${status}`;
};

const assertJsonResponse = async (response: Response) => {
	const text = await response.text();
	const data = parseJsonObject(text);
	if (!response.ok) {
		throw new Error(formatShengwangError(data, response.status));
	}

	return data as Record<string, unknown>;
};

const redactAuthHeader = (value: string) =>
	value.startsWith("Basic ") ? "Basic [REDACTED]" : "[REDACTED]";

const logSttJoinRequest = ({
	url,
	headers,
	body,
}: {
	url: string;
	headers: Record<string, string>;
	body: Record<string, unknown>;
}) => {
	console.info(
		`[stt-demo] Shengwang STT join request ${JSON.stringify(
			{
				url,
				method: "POST",
				headers: {
					...headers,
					...(headers.Authorization
						? { Authorization: redactAuthHeader(headers.Authorization) }
						: {}),
				},
				body,
			},
			null,
			2,
		)}`,
	);
};

export const startSttSession = async (
	request: SttSessionStartRequest,
	config: AgoraServerConfig = getAgoraServerConfig(),
): Promise<SttSessionStartResponse> => {
	if (!isValidChannelName(request.channelName)) {
		throw new Error("Invalid channelName");
	}

	if (!request.controllerUserId) {
		throw new Error("Missing controllerUserId");
	}

	const languageValidation = validateLanguageSelection(request);
	if (!languageValidation.ok) {
		throw new Error(languageValidation.message);
	}
	const { recognitionMode, sourceLanguages, targetLanguages } =
		languageValidation.selection;

	const sessionId = createSessionId();
	const { subBotUid, pubBotUid } = config;
	const botTokenConfig = config.usesDynamicToken
		? {
				subBotToken: createRtcToken({
					channelName: request.channelName,
					uid: subBotUid,
					config,
				}).token,
				pubBotToken: createRtcToken({
					channelName: request.channelName,
					uid: pubBotUid,
					config,
				}).token,
			}
		: {};

	const body = {
		languages: sourceLanguages,
		...(config.sttKeywords.length > 0 ? { keywords: config.sttKeywords } : {}),
		name: `stt-group-${sessionId}`,
		maxIdleTime: config.maxIdleTimeSeconds,
		...(config.sttGraphId ? { graph_id: config.sttGraphId } : {}),
		...(request.sttVendor
			? {
					extensionParams: {
						enable_dump: true,
						dump_level: "full",
						asr: {
							vendor: request.sttVendor,
						},
					},
				}
			: {}),
		...(config.captionStorage
			? {
					captionConfig: {
						sliceDuration: config.captionStorage.sliceDuration,
						storage: {
							vendor: mapCaptionProviderToShengwangVendor(
								config.captionStorage.provider,
							),
							region: config.captionStorage.regionCode,
							bucket: config.captionStorage.bucket,
							accessKey: config.captionStorage.accessKey,
							secretKey: config.captionStorage.secretKey,
							fileNamePrefix: buildCaptionFileNamePrefixList({
								prefixRoot: config.captionStorage.prefixRoot,
								channelName: request.channelName,
								sessionId,
							}),
						},
					},
				}
			: {}),
		rtcConfig: {
			channelName: request.channelName,
			subBotUid,
			pubBotUid,
			...(request.enableJsonProtocol === true
				? { enableJsonProtocol: true }
				: {}),
			...botTokenConfig,
		},
		translateConfig: {
			forceTranslateInterval: config.sttForceTranslateIntervalSeconds,
			languages:
				recognitionMode === "auto"
					? [{ source: "auto", target: targetLanguages }]
					: sourceLanguages.map((source) => ({
							source,
							target: targetLanguages,
						})),
		},
	};
	const joinUrl = `${config.sttRestBaseUrl}/projects/${config.appId}/join`;
	const headers = {
		Authorization: basicAuthHeader(config),
		"Content-Type": "application/json",
		...(config.requestHeaders ?? {}),
	};

	logSttJoinRequest({
		url: joinUrl,
		headers,
		body,
	});

	const response = await createServerFetch(joinUrl, {
		method: "POST",
		headers,
		body: JSON.stringify(body),
	});
	const data = (await assertJsonResponse(response)) as ShengwangJoinResponse;

	if (!data.agent_id) {
		throw new Error("Shengwang STT join response missing agent_id");
	}

	return {
		appId: config.appId,
		sessionId,
		agentId: data.agent_id,
		status: data.status,
		controllerUserId: request.controllerUserId,
		recognitionMode,
		sourceLanguages,
		targetLanguages,
		subBotUid,
		pubBotUid,
		startedAt: Date.now(),
	};
};

export const stopSttSession = async (agentId: string) => {
	if (!agentId) {
		throw new Error("Missing agentId");
	}

	const config = getAgoraServerConfig();
	const response = await createServerFetch(
		`${config.sttRestBaseUrl}/projects/${config.appId}/agents/${agentId}/leave`,
		{
			method: "POST",
			headers: {
				Authorization: basicAuthHeader(config),
				"Content-Type": "application/json",
			},
		},
	);

	return assertJsonResponse(response);
};

export const getSttSessionStatus = async (
	agentId: string,
): Promise<ShengwangAgentStatusResponse> => {
	if (!agentId) {
		throw new Error("Missing agentId");
	}

	const config = getAgoraServerConfig();
	const response = await createServerFetch(
		`${config.sttRestBaseUrl}/projects/${config.appId}/agents/${agentId}`,
		{
			method: "GET",
			headers: {
				Authorization: basicAuthHeader(config),
			},
		},
	);

	return assertJsonResponse(response) as Promise<ShengwangAgentStatusResponse>;
};
