import {
	type LanguageCode,
	normalizeLanguageSelection,
	type RecognitionMode,
} from "./languages";

export const MAX_GROUP_PARTICIPANTS = 8;
export const DEFAULT_EXPERIENCE_SECONDS = 10 * 60;
export const getParticipantLimitReachedMessage = () =>
	`频道人数已满（最多 ${MAX_GROUP_PARTICIPANTS} 人）`;

export type SubtitleDisplayMode = "both" | "source" | "target";

export type RoomSettings = {
	channelName: string;
	nickname: string;
	recognitionMode: RecognitionMode;
	sourceLanguages: LanguageCode[];
	targetLanguages: LanguageCode[];
};

export const normalizeNickname = (value: string, fallback: string) => {
	const nickname = value.trim();
	return nickname.length > 0 ? nickname : fallback;
};

export const buildRoomSettings = ({
	channelName,
	nickname,
	fallbackNickname,
	recognitionMode,
	sourceLanguages,
	targetLanguages,
}: {
	channelName: string;
	nickname: string;
	fallbackNickname: string;
	recognitionMode: RecognitionMode;
	sourceLanguages: string[];
	targetLanguages: string[];
}): RoomSettings => {
	const languageSelection = normalizeLanguageSelection({
		recognitionMode,
		sourceLanguages,
		targetLanguages,
	});

	return {
		channelName: channelName.trim(),
		nickname: normalizeNickname(nickname, fallbackNickname),
		recognitionMode: languageSelection.recognitionMode,
		sourceLanguages: languageSelection.sourceLanguages,
		targetLanguages: languageSelection.targetLanguages,
	};
};

export const getRemainingSeconds = (
	startedAt: number | undefined,
	now = Date.now(),
	totalSeconds = DEFAULT_EXPERIENCE_SECONDS,
) => {
	if (!startedAt) {
		return totalSeconds;
	}

	const elapsedSeconds = Math.floor((now - startedAt) / 1000);
	return Math.max(0, totalSeconds - elapsedSeconds);
};

export const isParticipantLimitReached = (participantCount: number) =>
	participantCount >= MAX_GROUP_PARTICIPANTS;

export const isParticipantLimitExceeded = (participantCount: number) =>
	participantCount > MAX_GROUP_PARTICIPANTS;
