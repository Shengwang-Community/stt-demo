export const ERROR_CODES = {
	INVALID_LOCALE: "invalid_locale",
	SESSION_MISSING: "session_missing",
	SESSION_EXPIRED: "session_expired",
	VIEWER_LINK_INVALID: "viewer_link_invalid",
	ROOM_ENDED: "room_ended",
	VIEWER_SESSION_FAILED: "viewer_session_failed",
	UNKNOWN: "unknown_error",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
