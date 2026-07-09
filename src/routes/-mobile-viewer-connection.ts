import type {
	MobileViewerSessionResponse,
	SttRoomMember,
} from "#/lib/stt-group";
import {
	requestMobileViewerRtmToken,
	requestMobileViewerSession,
} from "#/lib/stt-group/client/api";
import type {
	GroupRtcSession,
	joinGroupRtcSession,
} from "#/lib/stt-group/client/rtc-client";
import type {
	joinMobileViewerRtmSession,
	MobileViewerRtmSession,
} from "#/lib/stt-group/client/rtm-client";
import type {
	DecodedSttTextMessage,
	RtmTokenResponse,
} from "#/lib/stt-group/domain";

type ConnectMobileViewerDependencies = {
	requestMobileViewerSession: typeof requestMobileViewerSession;
	requestMobileViewerRtmToken: typeof requestMobileViewerRtmToken;
	loadRtcClient: () => Promise<{
		joinGroupRtcSession: typeof joinGroupRtcSession;
	}>;
	loadRtmClient: () => Promise<{
		joinMobileViewerRtmSession: typeof joinMobileViewerRtmSession;
	}>;
	onRtmError: (error: unknown) => void;
};

type ConnectMobileViewerInput = {
	viewerToken: string;
	onSubtitle: (
		message: DecodedSttTextMessage,
		sessionResponse: MobileViewerSessionResponse,
	) => void;
	onMembers: (members: SttRoomMember[]) => void;
	dependencies?: Partial<ConnectMobileViewerDependencies>;
};

export type MobileViewerConnection = {
	sessionResponse: MobileViewerSessionResponse;
	rtcSession: GroupRtcSession;
	rtmSession: MobileViewerRtmSession | null;
};

const defaultDependencies: ConnectMobileViewerDependencies = {
	requestMobileViewerSession,
	requestMobileViewerRtmToken,
	loadRtcClient: () => import("#/lib/stt-group/client/rtc-client"),
	loadRtmClient: () => import("#/lib/stt-group/client/rtm-client"),
	onRtmError: (error) => {
		console.warn("Mobile viewer RTM member state unavailable", error);
	},
};

export const connectMobileViewer = async ({
	viewerToken,
	onSubtitle,
	onMembers,
	dependencies,
}: ConnectMobileViewerInput): Promise<MobileViewerConnection> => {
	const deps = { ...defaultDependencies, ...dependencies };
	const sessionResponse = await deps.requestMobileViewerSession({
		viewerToken,
	});
	const { joinGroupRtcSession } = await deps.loadRtcClient();
	const rtcSession = await joinGroupRtcSession({
		appId: sessionResponse.appId,
		channelName: sessionResponse.channelName,
		uid: Number(sessionResponse.uid),
		token: sessionResponse.token,
		pubBotUid: sessionResponse.pubBotUid,
		mode: "viewer",
		subtitleMessageFormat: sessionResponse.subtitleMessageFormat,
		onSubtitle: (message) => onSubtitle(message, sessionResponse),
	});

	let rtmSession: MobileViewerRtmSession | null = null;
	try {
		const [{ joinMobileViewerRtmSession }, rtmToken]: [
			{ joinMobileViewerRtmSession: typeof joinMobileViewerRtmSession },
			RtmTokenResponse,
		] = await Promise.all([
			deps.loadRtmClient(),
			deps.requestMobileViewerRtmToken({
				viewerToken,
				userId: sessionResponse.uid,
			}),
		]);
		rtmSession = await joinMobileViewerRtmSession({
			appId: rtmToken.appId,
			userId: rtmToken.userId,
			token: rtmToken.token,
			channelName: sessionResponse.channelName,
			onMembers,
		});
	} catch (error) {
		onMembers([]);
		deps.onRtmError(error);
	}

	return {
		sessionResponse,
		rtcSession,
		rtmSession,
	};
};
