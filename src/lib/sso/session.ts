import { createHmac, timingSafeEqual } from "node:crypto";
import { TOKEN_MAX_AGE_SECONDS } from "./constants";

export type AppSessionPayload = {
	exp: number;
	iat: number;
	userInfo: unknown;
};

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

export const createAppSessionJwt = ({
	now = Math.floor(Date.now() / 1000),
	secret,
	userInfo,
}: {
	now?: number;
	secret: string;
	userInfo: unknown;
}) => {
	if (!secret) {
		throw new Error("SSO_SESSION_SECRET is not configured");
	}

	const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
	const payload = base64UrlEncode(
		JSON.stringify({
			exp: now + TOKEN_MAX_AGE_SECONDS,
			iat: now,
			userInfo,
		} satisfies AppSessionPayload),
	);
	const unsignedToken = `${header}.${payload}`;
	return `${unsignedToken}.${sign(unsignedToken, secret)}`;
};

export const verifyAppSessionJwt = ({
	now = Math.floor(Date.now() / 1000),
	secret,
	token,
}: {
	now?: number;
	secret: string;
	token: string;
}): AppSessionPayload | null => {
	if (!secret) {
		throw new Error("SSO_SESSION_SECRET is not configured");
	}

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
			!("userInfo" in parsedPayload) ||
			parsedPayload.exp <= now
		) {
			return null;
		}

		return parsedPayload as AppSessionPayload;
	} catch {
		return null;
	}
};
