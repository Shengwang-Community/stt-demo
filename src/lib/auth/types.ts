export type AuthMode = "sso" | "guest";

export type AppIdentity = {
	authMode: AuthMode;
	userId: string;
	displayName: string;
	rawUserInfo?: unknown;
};

export type AuthSessionResponse = {
	code: 0;
	data: AppIdentity;
};
