import { v7 as uuidv7 } from "uuid";
import type { LanguageCode, RecognitionMode } from "./languages";
import type { SupportedSttVendor } from "./vendor-options";

export const DEFAULT_STT_MAX_IDLE_TIME_SECONDS = 600;

export const AGORA_RTM_CHANNEL_TYPE = "MESSAGE";
export const AGORA_RTM_STT_LOCK_NAME = "stt-session-control";
export const AGORA_RTM_ADMISSION_LOCK_NAME = "stt-room-admission";
export const AGORA_RTM_ROOM_METADATA_KEY = "sttRoom";
export const AGORA_RTM_ADMISSION_METADATA_KEY = "sttRoomAdmission";

export type SttRoomStatus = "end" | "starting" | "start" | "stopping" | "error";
export type SttRoomCloseReason = "manual" | "expired";

export type SttRoomMetadata = {
	sessionId?: string;
	status: SttRoomStatus;
	agentId?: string;
	controllerUserId?: string;
	recognitionMode?: RecognitionMode;
	sourceLanguages?: LanguageCode[];
	targetLanguages?: LanguageCode[];
	subBotUid?: string;
	pubBotUid?: string;
	startedAt?: number;
	experienceLimitRemoved?: boolean;
	closeReason?: SttRoomCloseReason;
	error?: string;
};

export type SttRoomAdmissionMetadata = {
	participantUserIds: string[];
};

export type SttRoomMember = {
	userId: string;
	rtcUid?: string;
	displayName: string;
	joinedAt?: number;
	isController?: boolean;
};

export type DeveloperModeRequestOverrides = {
	applied?: boolean;
	customAppId?: string;
	requestBaseUrl?: string;
	xServiceNamespace?: string;
};

export type SttSessionStartRequest = {
	channelName: string;
	controllerUserId: string;
	controllerName: string;
	recognitionMode: RecognitionMode;
	sourceLanguages: LanguageCode[];
	targetLanguages: LanguageCode[];
	enableJsonProtocol?: boolean;
	sttVendor?: SupportedSttVendor;
	developerOverrides?: DeveloperModeRequestOverrides;
};

export type SttSessionStartResponse = {
	appId: string;
	sessionId: string;
	agentId: string;
	status: string;
	controllerUserId: string;
	recognitionMode: RecognitionMode;
	sourceLanguages: LanguageCode[];
	targetLanguages: LanguageCode[];
	subBotUid: string;
	pubBotUid: string;
	startedAt: number;
};

export type SttSessionStopRequest = {
	agentId: string;
	controllerUserId: string;
	roomControllerUserId: string;
};

export type RtcTokenRequest = {
	channelName: string;
	uid: string;
	developerOverrides?: DeveloperModeRequestOverrides;
};

export type RtcTokenResponse = {
	appId: string;
	token: string | null;
	uid: string;
};

export type RtmTokenRequest = {
	userId: string;
};

export type RtmTokenResponse = {
	appId: string;
	token: string | null;
	userId: string;
};

export type SubtitleLine = {
	id: string;
	speakerUid: string;
	sentenceId?: string;
	sourceLanguage?: string;
	sourceText: string;
	targetTexts: Record<string, string>;
	isFinal: boolean;
	startedAt?: number;
	updatedAt: number;
	sourceVersionTextTs?: number;
	targetVersionTextTs?: Record<string, number>;
	sourceFragments?: SubtitleLineFragment[];
	targetTextFragments?: Record<string, SubtitleLineTranslationFragment[]>;
	currentTailFragmentKey?: string;
};

export type SubtitleWord = {
	text: string;
	startMs?: number;
	durationMs?: number;
	isFinal: boolean;
};

export type SubtitleLineFragment = {
	fragmentKey: string;
	text: string;
	isFinal: boolean;
};

export type SubtitleLineTranslationFragment = {
	fragmentKey: string;
	text: string;
	isFinal: boolean;
};

export type DecodedSttTextMessage = {
	uid: string;
	time?: number;
	durationMs?: number;
	dataType?: "transcribe" | "translate" | string;
	culture?: string;
	textTs?: number;
	sentenceId?: string;
	words: SubtitleWord[];
	trans: Array<{ lang: string; texts: string[]; isFinal: boolean }>;
	originalTranscript?: {
		culture?: string;
		words: SubtitleWord[];
	};
	alignedOriginalTranscript?: {
		culture?: string;
		words: SubtitleWord[];
	};
	payloadFormat?: "pb" | "json";
};

export const createUuid = () => uuidv7();

export const createHumanUid = () =>
	String(100000 + Math.floor(Math.random() * 100000));

export const createSessionId = () => createUuid();

export const createDefaultChannelName = () =>
	Array.from({ length: 6 }, () => {
		const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
		return chars[Math.floor(Math.random() * chars.length)];
	}).join("");

export const normalizeChannelName = (value: string) => value.trim();

export const isValidChannelName = (value: string) => {
	const channelName = normalizeChannelName(value);
	return (
		channelName.length > 0 &&
		channelName !== "null" &&
		/^[A-Za-z0-9-]+$/.test(channelName) &&
		new TextEncoder().encode(channelName).byteLength <= 64
	);
};

export const emptyRoomMetadata = (): SttRoomMetadata => ({ status: "end" });

export const buildStartedRoomMetadata = (
	response: SttSessionStartResponse,
): SttRoomMetadata => ({
	sessionId: response.sessionId,
	status: "start",
	agentId: response.agentId,
	controllerUserId: response.controllerUserId,
	recognitionMode: response.recognitionMode,
	sourceLanguages: response.sourceLanguages,
	targetLanguages: response.targetLanguages,
	subBotUid: response.subBotUid,
	pubBotUid: response.pubBotUid,
	startedAt: response.startedAt,
	experienceLimitRemoved: false,
});

export const parseRoomMetadata = (value: unknown): SttRoomMetadata => {
	if (typeof value !== "string" || value.length === 0) {
		return emptyRoomMetadata();
	}

	try {
		const parsed = JSON.parse(value) as Partial<SttRoomMetadata>;
		if (
			parsed.status === "starting" ||
			parsed.status === "start" ||
			parsed.status === "stopping" ||
			parsed.status === "error" ||
			parsed.status === "end"
		) {
			return {
				...parsed,
				status: parsed.status,
			};
		}
	} catch {
		return emptyRoomMetadata();
	}

	return emptyRoomMetadata();
};

export const stringifyRoomMetadata = (metadata: SttRoomMetadata) =>
	JSON.stringify(metadata);

export const emptyRoomAdmissionMetadata = (): SttRoomAdmissionMetadata => ({
	participantUserIds: [],
});

export const parseRoomAdmissionMetadata = (
	value: unknown,
): SttRoomAdmissionMetadata => {
	if (typeof value !== "string" || value.length === 0) {
		return emptyRoomAdmissionMetadata();
	}

	try {
		const parsed = JSON.parse(value) as Partial<SttRoomAdmissionMetadata>;
		if (Array.isArray(parsed.participantUserIds)) {
			return {
				participantUserIds: parsed.participantUserIds.filter(
					(participantUserId): participantUserId is string =>
						typeof participantUserId === "string" &&
						participantUserId.length > 0,
				),
			};
		}
	} catch {
		return emptyRoomAdmissionMetadata();
	}

	return emptyRoomAdmissionMetadata();
};

export const stringifyRoomAdmissionMetadata = (
	metadata: SttRoomAdmissionMetadata,
) => JSON.stringify(metadata);

export const assertControllerCanStop = ({
	controllerUserId,
	roomControllerUserId,
}: {
	controllerUserId: string;
	roomControllerUserId: string;
}) => {
	if (!controllerUserId || !roomControllerUserId) {
		throw new Error("Missing controller identity");
	}

	if (controllerUserId !== roomControllerUserId) {
		throw new Error("Only the room controller can stop this STT session");
	}
};
