import { ApiError } from "#/lib/stt-group/client/api";
import { API_AUTH_LOGOUT, API_AUTH_SESSION } from "./runtime";
import type { AuthSessionResponse } from "./types";

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

export const fetchAuthSession = async () => {
	const response = await fetch(API_AUTH_SESSION, { method: "GET" });

	if (response.status === 401) {
		return null;
	}

	const data = await readResponseJson(response);
	if (!response.ok) {
		throw new ApiError(
			getResponseMessage(data, "Failed to fetch auth session"),
			getResponseErrorCode(data),
		);
	}

	return data as AuthSessionResponse;
};

export const redirectToAuthLogout = () => {
	window.location.href = API_AUTH_LOGOUT;
};
