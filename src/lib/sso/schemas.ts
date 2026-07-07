export type RemoteResponse<TData = unknown> = {
	code?: number;
	msg?: string;
	tip?: string;
	data?: TData;
};

export type SsoTokenData = {
	accessToken: string;
	expiresIn?: number;
	refreshToken?: string;
	scope?: string | string[];
	tokenType: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null;
};

export const parseRemoteResponse = (value: unknown): RemoteResponse => {
	if (
		!isRecord(value) ||
		(value.code !== undefined && typeof value.code !== "number")
	) {
		throw new Error("Invalid remote response");
	}

	return {
		code: value.code,
		msg: typeof value.msg === "string" ? value.msg : undefined,
		tip: typeof value.tip === "string" ? value.tip : undefined,
		data: value.data,
	};
};

export const parseTokenResponse = (value: unknown): SsoTokenData => {
	const response = parseRemoteResponse(value);
	if (response.code !== undefined && response.code !== 0) {
		throw new Error(
			response.msg ?? response.tip ?? "Invalid SSO token response",
		);
	}

	const tokenValue = response.data ?? value;

	if (
		!isRecord(tokenValue) ||
		(typeof tokenValue.access_token !== "string" &&
			typeof tokenValue.accessToken !== "string") ||
		tokenValue.access_token === "" ||
		tokenValue.accessToken === "" ||
		(tokenValue.token_type !== undefined &&
			typeof tokenValue.token_type !== "string") ||
		(tokenValue.tokenType !== undefined &&
			typeof tokenValue.tokenType !== "string") ||
		(tokenValue.expires_in !== undefined &&
			typeof tokenValue.expires_in !== "number") ||
		(tokenValue.expiresIn !== undefined &&
			typeof tokenValue.expiresIn !== "number") ||
		(tokenValue.refresh_token !== undefined &&
			typeof tokenValue.refresh_token !== "string") ||
		(tokenValue.refreshToken !== undefined &&
			typeof tokenValue.refreshToken !== "string") ||
		(tokenValue.scope !== undefined &&
			typeof tokenValue.scope !== "string" &&
			(!Array.isArray(tokenValue.scope) ||
				!tokenValue.scope.every((scope) => typeof scope === "string")))
	) {
		throw new Error("Invalid SSO token response");
	}

	return {
		accessToken:
			typeof tokenValue.access_token === "string"
				? tokenValue.access_token
				: tokenValue.accessToken,
		expiresIn:
			typeof tokenValue.expires_in === "number"
				? tokenValue.expires_in
				: tokenValue.expiresIn,
		refreshToken:
			typeof tokenValue.refresh_token === "string"
				? tokenValue.refresh_token
				: tokenValue.refreshToken,
		scope: tokenValue.scope,
		tokenType:
			(typeof tokenValue.token_type === "string"
				? tokenValue.token_type
				: tokenValue.tokenType) ?? "Bearer",
	};
};
