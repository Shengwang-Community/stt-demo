import { createHmac, timingSafeEqual } from "node:crypto";
import { createHumanUid, isValidChannelName } from "../domain";
import type {
	MobileViewerLinkRequest,
	MobileViewerLinkResponse,
	MobileViewerSessionResponse,
	MobileViewerTokenPayload,
} from "../mobile-viewer";
import { getMobileViewerServerConfig } from "./env";
import { getSttSessionStatus } from "./stt-rest";
import { createRtcToken } from "./tokens";

const textEncoder = new TextEncoder();

const base64UrlEncode = (value: string | Uint8Array) => {
	const bytes = typeof value === "string" ? textEncoder.encode(value) : value;
	return Buffer.from(bytes)
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/g, "");
};

const base64UrlDecode = (value: string) => {
	const padded = value.padEnd(
		value.length + ((4 - (value.length % 4)) % 4),
		"=",
	);
	return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
};

const sign = (value: string, secret: string) =>
	base64UrlEncode(createHmac("sha256", secret).update(value).digest());

const parseJson = (value: Buffer): unknown =>
	JSON.parse(value.toString("utf8"));

const isActiveSttStatus = (status: unknown) =>
	status === "RUNNING" || status === "STARTING" || status === "RECOVERING";

const normalizeViewerBrandLogoUrl = (brandLogoUrl?: string | null) => {
	if (!brandLogoUrl) {
		return brandLogoUrl;
	}

	return brandLogoUrl.startsWith("data:") ? null : brandLogoUrl;
};

export const createMobileViewerToken = ({
	now = Math.floor(Date.now() / 1000),
	payload,
	secret,
	maxAgeSeconds,
}: {
	now?: number;
	payload: Omit<MobileViewerTokenPayload, "iat" | "exp">;
	secret: string;
	maxAgeSeconds: number;
}) => {
	const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
	const fullPayload: MobileViewerTokenPayload = {
		...payload,
		iat: now,
		exp: now + maxAgeSeconds,
	};
	const body = base64UrlEncode(JSON.stringify(fullPayload));
	const unsignedToken = `${header}.${body}`;
	return `${unsignedToken}.${sign(unsignedToken, secret)}`;
};

export const verifyMobileViewerToken = ({
	now = Math.floor(Date.now() / 1000),
	secret,
	token,
}: {
	now?: number;
	secret: string;
	token: string;
}): MobileViewerTokenPayload | null => {
	const parts = token.split(".");
	if (parts.length !== 3) {
		return null;
	}

	const [header, payload, signature] = parts;
	if (!header || !payload || !signature) {
		return null;
	}

	const unsignedToken = `${header}.${payload}`;
	const expectedSignature = sign(unsignedToken, secret);
	const signatureBytes = textEncoder.encode(signature);
	const expectedSignatureBytes = textEncoder.encode(expectedSignature);

	if (
		signatureBytes.length !== expectedSignatureBytes.length ||
		!timingSafeEqual(signatureBytes, expectedSignatureBytes)
	) {
		return null;
	}

	try {
		const parsedHeader = parseJson(base64UrlDecode(header));
		const parsedPayload = parseJson(base64UrlDecode(payload));
		if (
			typeof parsedHeader !== "object" ||
			parsedHeader === null ||
			!("alg" in parsedHeader) ||
			parsedHeader.alg !== "HS256" ||
			typeof parsedPayload !== "object" ||
			parsedPayload === null ||
			!("exp" in parsedPayload) ||
			typeof parsedPayload.exp !== "number" ||
			!("iat" in parsedPayload) ||
			typeof parsedPayload.iat !== "number" ||
			parsedPayload.exp <= now
		) {
			return null;
		}

		return parsedPayload as MobileViewerTokenPayload;
	} catch {
		return null;
	}
};

export const createMobileViewerLink = async ({
	now = Math.floor(Date.now() / 1000),
	requestOrigin,
	channelName,
	sessionId,
	agentId,
	pubBotUid,
	sourceLanguages,
	targetLanguages,
	subtitleRenderMode,
	brandName,
	brandLogoUrl,
}: MobileViewerLinkRequest & {
	now?: number;
	requestOrigin: string;
}): Promise<MobileViewerLinkResponse> => {
	if (!isValidChannelName(channelName)) {
		throw new Error("Invalid channelName");
	}

	if (!sessionId || !agentId || !pubBotUid) {
		throw new Error("Missing mobile viewer session data");
	}

	const status = await getSttSessionStatus(agentId);
	if (!isActiveSttStatus(status.status)) {
		throw new Error("房间字幕已结束");
	}

	const { tokenSecret, tokenMaxAgeSeconds } = getMobileViewerServerConfig();
	const safeBrandLogoUrl = normalizeViewerBrandLogoUrl(brandLogoUrl);
	const viewerToken = createMobileViewerToken({
		now,
		secret: tokenSecret,
		maxAgeSeconds: tokenMaxAgeSeconds,
		payload: {
			channelName,
			sessionId,
			agentId,
			pubBotUid,
			sourceLanguages,
			targetLanguages,
			subtitleRenderMode,
			brandName,
			brandLogoUrl: safeBrandLogoUrl,
		},
	});

	return {
		viewerToken,
		viewerUrl: `${requestOrigin}/mobile?viewerToken=${viewerToken}`,
		expiresAt: (now + tokenMaxAgeSeconds) * 1000,
	};
};

export const createMobileViewerSession = async ({
	now = Math.floor(Date.now() / 1000),
	viewerToken,
}: {
	now?: number;
	viewerToken: string;
}): Promise<MobileViewerSessionResponse> => {
	const { tokenSecret } = getMobileViewerServerConfig();
	const payload = verifyMobileViewerToken({
		now,
		secret: tokenSecret,
		token: viewerToken,
	});

	if (!payload) {
		throw new Error("链接无效或已过期");
	}

	const status = await getSttSessionStatus(payload.agentId);
	if (!isActiveSttStatus(status.status)) {
		throw new Error("房间字幕已结束");
	}

	const rtcToken = createRtcToken({
		channelName: payload.channelName,
		uid: createHumanUid(),
	});
	return {
		appId: rtcToken.appId,
		channelName: payload.channelName,
		uid: rtcToken.uid,
		token: rtcToken.token,
		pubBotUid: payload.pubBotUid,
		sourceLanguages: payload.sourceLanguages,
		targetLanguages: payload.targetLanguages,
		subtitleRenderMode: payload.subtitleRenderMode,
		brandName: payload.brandName,
		brandLogoUrl: payload.brandLogoUrl,
		sessionId: payload.sessionId,
		expiresAt: payload.exp * 1000,
	};
};
