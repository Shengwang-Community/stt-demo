import AgoraAccessToken from "agora-access-token";
import {
	type AgoraRuntimeConfig,
	getRtcAgoraTokenConfig,
	getRtmAgoraTokenConfig,
} from "./env";

const { RtcRole, RtcTokenBuilder, RtmRole, RtmTokenBuilder } = AgoraAccessToken;

const TOKEN_TTL_SECONDS = 60 * 60;

const getPrivilegeExpireTs = () =>
	Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;

export const createRtcToken = ({
	channelName,
	uid,
	config = getRtcAgoraTokenConfig(),
}: {
	channelName: string;
	uid: string;
	config?: AgoraRuntimeConfig;
}) => {
	const { appId, appCertificate, usesDynamicToken } = config;
	const numericUid = Number(uid);
	if (!Number.isInteger(numericUid) || numericUid < 0) {
		throw new Error("RTC uid must be a numeric string");
	}

	if (!usesDynamicToken) {
		return { appId, token: null, uid };
	}

	const token = RtcTokenBuilder.buildTokenWithUid(
		appId,
		appCertificate,
		channelName,
		numericUid,
		RtcRole.PUBLISHER,
		getPrivilegeExpireTs(),
	);

	return { appId, token, uid };
};

export const createRtmToken = ({ userId }: { userId: string }) => {
	const { appId, appCertificate, usesDynamicToken } = getRtmAgoraTokenConfig();
	if (!usesDynamicToken) {
		return { appId, token: null, userId };
	}

	const token = RtmTokenBuilder.buildToken(
		appId,
		appCertificate,
		userId,
		RtmRole.Rtm_User,
		getPrivilegeExpireTs(),
	);

	return { appId, token, userId };
};
