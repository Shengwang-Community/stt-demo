import { randomUUID } from "node:crypto";
import { createAppSessionJwt, verifyAppSessionJwt } from "#/lib/sso/session";
import type { AppIdentity } from "./types";

const GUEST_DISPLAY_NAME_PREFIX = "体验用户";

type GuestUserInfo = {
	authMode: "guest";
	guestId: string;
	displayName: string;
};

const getStringField = (value: unknown, key: string) => {
	if (typeof value !== "object" || value === null) {
		return "";
	}

	const fieldValue = (value as Record<string, unknown>)[key];
	return typeof fieldValue === "string" ? fieldValue.trim() : "";
};

const getNumberField = (value: unknown, key: string) => {
	if (typeof value !== "object" || value === null) {
		return "";
	}

	const fieldValue = (value as Record<string, unknown>)[key];
	return typeof fieldValue === "number" && Number.isFinite(fieldValue)
		? String(fieldValue)
		: "";
};

export const getSsoIdentityDisplayName = (userInfo: unknown) => {
	for (const key of ["displayName", "nickname", "email", "accountUid"]) {
		const value = getStringField(userInfo, key);
		if (value) {
			return value;
		}
	}

	return "Authenticated user";
};

export const getSsoIdentityUserId = (userInfo: unknown) => {
	for (const key of ["accountUid", "userId", "uid", "email"]) {
		const stringValue = getStringField(userInfo, key);
		if (stringValue) {
			return stringValue;
		}

		const numberValue = getNumberField(userInfo, key);
		if (numberValue) {
			return numberValue;
		}
	}

	return getSsoIdentityDisplayName(userInfo);
};

export const createSsoIdentity = (userInfo: unknown): AppIdentity => ({
	authMode: "sso",
	userId: getSsoIdentityUserId(userInfo),
	displayName: getSsoIdentityDisplayName(userInfo),
	rawUserInfo: userInfo,
});

const createGuestDisplayName = (guestId: string) =>
	`${GUEST_DISPLAY_NAME_PREFIX} ${guestId.slice(-4).toUpperCase()}`;

export const createGuestIdentity = (guestId = randomUUID()): AppIdentity => ({
	authMode: "guest",
	userId: guestId,
	displayName: createGuestDisplayName(guestId),
});

const isGuestUserInfo = (value: unknown): value is GuestUserInfo => {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const record = value as Record<string, unknown>;
	return (
		record.authMode === "guest" &&
		typeof record.guestId === "string" &&
		record.guestId.length > 0 &&
		typeof record.displayName === "string" &&
		record.displayName.length > 0
	);
};

export const createGuestSessionJwt = ({
	now,
	secret,
	identity = createGuestIdentity(),
}: {
	now?: number;
	secret: string;
	identity?: AppIdentity;
}) =>
	createAppSessionJwt({
		now,
		secret,
		userInfo: {
			authMode: "guest",
			guestId: identity.userId,
			displayName: identity.displayName,
		} satisfies GuestUserInfo,
	});

export const verifyGuestSessionJwt = ({
	now,
	secret,
	token,
}: {
	now?: number;
	secret: string;
	token: string;
}): AppIdentity | null => {
	const session = verifyAppSessionJwt({ now, secret, token });
	if (!session || !isGuestUserInfo(session.userInfo)) {
		return null;
	}

	return {
		authMode: "guest",
		userId: session.userInfo.guestId,
		displayName: session.userInfo.displayName,
	};
};
