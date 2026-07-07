import { API_SSO_LOGIN, API_SSO_LOGOUT, API_SSO_USER_INFO } from "./constants";
import { parseRemoteResponse } from "./schemas";
import { ApiError } from "#/lib/stt-group/client/api";

export const fetchSsoUserInfo = async () => {
	const response = await fetch(API_SSO_USER_INFO, { method: "GET" });

	if (response.status === 401) {
		return null;
	}

	const data = await response.json();

	if (!response.ok) {
		throw new ApiError(
			typeof data?.msg === "string"
				? data.msg
				: "Failed to fetch SSO user info",
			typeof data?.errorCode === "string" ? data.errorCode : undefined,
		);
	}

	return parseRemoteResponse(data);
};

export const redirectToSsoLogin = () => {
	window.location.href = API_SSO_LOGIN;
};

export const redirectToSsoLogout = () => {
	window.location.href = API_SSO_LOGOUT;
};
