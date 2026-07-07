import type AgoraRTC from "agora-rtc-sdk-ng";
import type AgoraRTM from "agora-rtm";

export const configureAgoraRtcChinaArea = (agoraRtc: typeof AgoraRTC): void => {
	agoraRtc.setArea([agoraRtc.AREAS.CHINA]);
};

export const configureAgoraRtmChinaArea = (agoraRtm: typeof AgoraRTM): void => {
	agoraRtm.setArea({
		areaCodes: [agoraRtm.constantsType.AreaCode.CHINA],
	});
};
