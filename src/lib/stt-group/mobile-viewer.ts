import type { SubtitleRenderMode } from "#/lib/developer-mode/types";
import type { LanguageCode } from "./languages";

export type MobileViewerTokenPayload = {
	channelName: string;
	sessionId: string;
	agentId: string;
	pubBotUid: string;
	sourceLanguages: LanguageCode[];
	targetLanguages: LanguageCode[];
	subtitleRenderMode: SubtitleRenderMode;
	brandName?: string;
	brandLogoUrl?: string | null;
	iat: number;
	exp: number;
};

export type MobileViewerLinkRequest = {
	channelName: string;
	sessionId: string;
	agentId: string;
	pubBotUid: string;
	sourceLanguages: LanguageCode[];
	targetLanguages: LanguageCode[];
	subtitleRenderMode: SubtitleRenderMode;
	brandName?: string;
	brandLogoUrl?: string | null;
};

export type MobileViewerLinkResponse = {
	viewerToken: string;
	viewerUrl: string;
	expiresAt: number;
};

export type MobileViewerSessionRequest = {
	viewerToken: string;
};

export type MobileViewerSessionResponse = {
	appId: string;
	channelName: string;
	uid: string;
	token: string | null;
	pubBotUid: string;
	sourceLanguages: LanguageCode[];
	targetLanguages: LanguageCode[];
	subtitleRenderMode: SubtitleRenderMode;
	brandName?: string;
	brandLogoUrl?: string | null;
	sessionId: string;
	expiresAt: number;
};

export type MobileViewerPageState =
	| "connecting"
	| "live"
	| "expired"
	| "ended"
	| "error";
