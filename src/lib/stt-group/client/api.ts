import type {
	MobileViewerLinkRequest,
	MobileViewerLinkResponse,
	MobileViewerSessionRequest,
	MobileViewerSessionResponse,
	RtcTokenRequest,
	RtcTokenResponse,
	RtmTokenResponse,
	SttSessionStartRequest,
	SttSessionStartResponse,
	SttSessionStopRequest,
} from "../domain";

export class ApiError extends Error {
	errorCode?: string;

	constructor(message: string, errorCode?: string) {
		super(message);
		this.errorCode = errorCode;
	}
}

export type SessionVttDownloadItem = {
	key: string;
	filename: string;
};

export const buildSessionVttDownloadUrl = ({
	channelName,
	sessionId,
	type,
	key,
}: {
	channelName: string;
	sessionId: string;
	type: "source" | "target";
	key: string;
}) =>
	`/api/stt-group/session/vtt?channelName=${encodeURIComponent(
		channelName,
	)}&sessionId=${encodeURIComponent(sessionId)}&type=${encodeURIComponent(
		type,
	)}&action=download&key=${encodeURIComponent(key)}`;

export const buildSessionVttZipDownloadUrl = ({
	channelName,
	sessionId,
	type,
	targetLanguage,
}: {
	channelName: string;
	sessionId: string;
	type: "source" | "target";
	targetLanguage?: string;
}) =>
	`/api/stt-group/session/vtt?channelName=${encodeURIComponent(
		channelName,
	)}&sessionId=${encodeURIComponent(sessionId)}&type=${encodeURIComponent(
		type,
	)}&action=download-zip${
		targetLanguage
			? `&targetLanguage=${encodeURIComponent(targetLanguage)}`
			: ""
	}`;

export const downloadSessionVttZip = async ({
	channelName,
	sessionId,
	type,
	targetLanguage,
}: {
	channelName: string;
	sessionId: string;
	type: "source" | "target";
	targetLanguage?: string;
}) => {
	const response = await fetch(
		buildSessionVttZipDownloadUrl({
			channelName,
			sessionId,
			type,
			targetLanguage,
		}),
	);

	if (!response.ok) {
		let message = "Failed to download VTT zip";
		try {
			const data = await response.json();
			if (typeof data?.msg === "string") {
				message = data.msg;
			}
		} catch {
			// Keep the fallback message when the response cannot be parsed.
		}
		throw new ApiError(message);
	}

	return response.blob();
};

export const downloadSessionVttFile = async ({
	channelName,
	sessionId,
	type,
	key,
}: {
	channelName: string;
	sessionId: string;
	type: "source" | "target";
	key: string;
}) => {
	const response = await fetch(
		buildSessionVttDownloadUrl({
			channelName,
			sessionId,
			type,
			key,
		}),
	);

	if (!response.ok) {
		let message = "Failed to download VTT";
		try {
			const data = await response.json();
			if (typeof data?.msg === "string") {
				message = data.msg;
			}
		} catch {
			// Keep the fallback message when the response cannot be parsed.
		}
		throw new ApiError(message);
	}

	return response.arrayBuffer();
};

const readResponseJson = async (response: Response) => {
	const text = await response.text();
	if (!text) {
		return null;
	}

	try {
		return JSON.parse(text) as unknown;
	} catch {
		return null;
	}
};

const getResponseMessage = (data: unknown, fallback: string) => {
	if (
		typeof data === "object" &&
		data !== null &&
		"msg" in data &&
		typeof data.msg === "string"
	) {
		return data.msg;
	}

	return fallback;
};

const getResponseErrorCode = (data: unknown) => {
	if (
		typeof data === "object" &&
		data !== null &&
		"errorCode" in data &&
		typeof data.errorCode === "string"
	) {
		return data.errorCode;
	}

	return undefined;
};

const postJson = async <TResponse>(url: string, body: unknown) => {
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const data = await readResponseJson(response);

	if (!response.ok) {
		throw new ApiError(
			getResponseMessage(data, `Request failed: ${url}`),
			getResponseErrorCode(data),
		);
	}

	return data as TResponse;
};

export const requestRtcToken = (body: RtcTokenRequest) =>
	postJson<RtcTokenResponse>("/api/rtc/token", body);

export const requestRtmToken = (body: { userId: string }) =>
	postJson<RtmTokenResponse>("/api/rtm/token", body);

export const requestStartSttSession = (body: SttSessionStartRequest) =>
	postJson<SttSessionStartResponse>("/api/stt-group/session/start", body);

export const requestStopSttSession = (body: SttSessionStopRequest) =>
	postJson<Record<string, unknown>>("/api/stt-group/session/stop", body);

export const listSessionVtt = async ({
	channelName,
	sessionId,
	type,
	targetLanguage,
}: {
	channelName: string;
	sessionId: string;
	type: "source" | "target";
	targetLanguage?: string;
}) => {
	const response = await fetch(
		`/api/stt-group/session/vtt?channelName=${encodeURIComponent(
			channelName,
		)}&sessionId=${encodeURIComponent(sessionId)}&type=${encodeURIComponent(
			type,
		)}&action=list${
			targetLanguage
				? `&targetLanguage=${encodeURIComponent(targetLanguage)}`
				: ""
		}`,
	);

	if (!response.ok) {
		let message = "Failed to download VTT";
		try {
			const data = await response.json();
			if (typeof data?.msg === "string") {
				message = data.msg;
			}
		} catch {
			// Keep the fallback message when the response cannot be parsed.
		}
		throw new ApiError(message);
	}

	const data = (await response.json()) as { items?: SessionVttDownloadItem[] };
	return data.items ?? [];
};

export const requestSttSessionStatus = async (agentId: string) => {
	const response = await fetch(
		`/api/stt-group/session/status?agentId=${encodeURIComponent(agentId)}`,
	);
	const data = await response.json();

	if (!response.ok) {
		throw new ApiError(
			typeof data?.msg === "string" ? data.msg : "Failed to load STT status",
			typeof data?.errorCode === "string" ? data.errorCode : undefined,
		);
	}

	return data as Record<string, unknown>;
};

export const requestMobileViewerLink = (body: MobileViewerLinkRequest) =>
	postJson<MobileViewerLinkResponse>("/api/mobile-viewer/link", body);

export const requestMobileViewerSession = (body: MobileViewerSessionRequest) =>
	postJson<MobileViewerSessionResponse>("/api/mobile-viewer/session", body);
