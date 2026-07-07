import AgoraRTM from "agora-rtm";
import {
	AGORA_RTM_ADMISSION_LOCK_NAME,
	AGORA_RTM_ADMISSION_METADATA_KEY,
	AGORA_RTM_CHANNEL_TYPE,
	AGORA_RTM_ROOM_METADATA_KEY,
	AGORA_RTM_STT_LOCK_NAME,
	emptyRoomAdmissionMetadata,
	parseRoomAdmissionMetadata,
	parseRoomMetadata,
	type SttRoomAdmissionMetadata,
	type SttRoomMember,
	type SttRoomMetadata,
	stringifyRoomAdmissionMetadata,
	stringifyRoomMetadata,
} from "../domain";
import {
	getParticipantLimitReachedMessage,
	isParticipantLimitReached,
} from "../room-settings";
import { configureAgoraRtmChinaArea } from "./agora-area";
import {
	createPresenceReadyChannelName,
	type RtmPresenceEvent,
	runPresenceOperationWithRetry,
	waitForPresenceSnapshot,
} from "./rtm-presence-ready";

const { RTM } = AgoraRTM;
const RTM_CONFIG = {
	useStringUserId: true,
	logLevel: "debug",
	logUpload: true,
	presenceTimeout: 15,
} as const;

type RtmStorageEvent = {
	channelName?: string;
	storageType?: string;
	data?: {
		metadata?: Record<string, { value: string }>;
	};
};

type GroupRtmOptions = {
	appId: string;
	userId: string;
	rtcUid: string;
	token: string | null;
	channelName: string;
	displayName: string;
	onMembers: (members: SttRoomMember[]) => void;
	onMetadata: (metadata: SttRoomMetadata) => void;
};

type MobileViewerRtmOptions = {
	appId: string;
	userId: string;
	token: string | null;
	channelName: string;
	onMembers: (members: SttRoomMember[]) => void;
};

export type GroupRtmSession = {
	getMetadata: () => Promise<SttRoomMetadata>;
	setMetadata: (metadata: SttRoomMetadata) => Promise<void>;
	withSttLock: <T>(operation: () => Promise<T>) => Promise<T>;
	leave: () => Promise<void>;
};

export type MobileViewerRtmSession = {
	leave: () => Promise<void>;
};

const stateToMember = (
	userId: string,
	states: Record<string, string> | undefined,
): SttRoomMember => ({
	userId,
	rtcUid: states?.rtcUid,
	displayName: states?.displayName || userId,
	joinedAt: states?.joinedAt ? Number(states.joinedAt) : undefined,
});

const lockExists = (
	lockName: string,
	lockDetails: Array<{ lockName?: string }> = [],
) => lockDetails.some((lock) => lock.lockName === lockName);

const normalizePresenceUserStates = (
	value:
		| Array<{ userId?: string; states?: Record<string, string> }>
		| { users?: string[] }
		| undefined,
) => {
	if (Array.isArray(value)) {
		return value;
	}
	return value?.users?.map((userId) => ({ userId })) ?? [];
};

const createMetadataItem = ({
	key,
	value,
	revision = -1,
}: {
	key: string;
	value: string;
	revision?: number;
}) => ({
	key,
	value,
	revision,
	getKey() {
		return key;
	},
	getValue() {
		return value;
	},
	getRevision() {
		return revision;
	},
});

export const joinGroupRtmSession = async ({
	appId,
	userId,
	rtcUid,
	token,
	channelName,
	displayName,
	onMembers,
	onMetadata,
}: GroupRtmOptions): Promise<GroupRtmSession> => {
	configureAgoraRtmChinaArea(AgoraRTM);
	const rtm = new RTM(appId, userId, RTM_CONFIG);
	const members = new Map<string, SttRoomMember>();
	let localPresencePublished = false;
	const localMemberState = {
		displayName,
		rtcUid,
		joinedAt: String(Date.now()),
	};
	const localMember = () => stateToMember(userId, localMemberState);

	const emitMembers = () => onMembers([...members.values()]);
	const upsertLocalMember = () => {
		if (!localPresencePublished) {
			return;
		}
		members.set(userId, localMember());
	};

	const upsertMembers = (
		users: Array<{ userId?: string; states?: Record<string, string> }> = [],
	) => {
		for (const user of users) {
			if (!user.userId) {
				continue;
			}
			members.set(user.userId, stateToMember(user.userId, user.states));
		}
		emitMembers();
	};

	const removeMembers = (users: Array<{ userId?: string }> = []) => {
		for (const user of users) {
			if (user.userId) {
				members.delete(user.userId);
			}
		}
		emitMembers();
	};

	rtm.addEventListener("presence", (event: RtmPresenceEvent) => {
		if (event.channelName !== channelName) {
			return;
		}

		switch (event.eventType) {
			case "SNAPSHOT":
				members.clear();
				upsertMembers(event.snapshot ?? []);
				upsertLocalMember();
				emitMembers();
				break;
			case "REMOTE_STATE_CHANGED":
				if (event.publisher) {
					upsertMembers([
						{ userId: event.publisher, states: event.stateChanged ?? {} },
					]);
				}
				break;
			case "REMOTE_JOIN":
				if (event.publisher) {
					upsertMembers([{ userId: event.publisher }]);
				}
				break;
			case "REMOTE_LEAVE":
			case "REMOTE_TIMEOUT":
				if (event.publisher) {
					removeMembers([{ userId: event.publisher }]);
				}
				break;
			default:
				if (event.snapshot) {
					members.clear();
					upsertMembers(event.snapshot);
					upsertLocalMember();
					emitMembers();
				}
				break;
		}

		if (event.interval) {
			upsertMembers(normalizePresenceUserStates(event.interval.join));
			upsertMembers(event.interval.userStateList ?? []);
			removeMembers(normalizePresenceUserStates(event.interval.leave));
			removeMembers(normalizePresenceUserStates(event.interval.timeout));
		}
	});

	rtm.addEventListener("storage", (event: RtmStorageEvent) => {
		if (event.channelName !== channelName) {
			return;
		}
		const value = event.data?.metadata?.[AGORA_RTM_ROOM_METADATA_KEY]?.value;
		onMetadata(parseRoomMetadata(value));
	});

	await rtm.login(token ? { token } : {});
	const presenceReadyChannelName = createPresenceReadyChannelName(userId);
	const presenceReady = waitForPresenceSnapshot(rtm, presenceReadyChannelName);
	await rtm.subscribe(presenceReadyChannelName, {
		withMessage: false,
		withPresence: true,
		beQuiet: true,
	});
	await presenceReady;
	await rtm.unsubscribe(presenceReadyChannelName).catch(() => undefined);

	const businessPresenceReady = waitForPresenceSnapshot(rtm, channelName);
	await rtm.subscribe(channelName, {
		withMessage: false,
		withPresence: true,
		withMetadata: true,
		withLock: true,
	});
	await businessPresenceReady;

	const getMetadata = async () => {
		const response = await rtm.storage.getChannelMetadata(
			channelName,
			AGORA_RTM_CHANNEL_TYPE,
		);
		return parseRoomMetadata(
			response.metadata[AGORA_RTM_ROOM_METADATA_KEY]?.value,
		);
	};

	const getAdmissionMetadata = async () => {
		const response = await rtm.storage.getChannelMetadata(
			channelName,
			AGORA_RTM_CHANNEL_TYPE,
		);
		return parseRoomAdmissionMetadata(
			response.metadata[AGORA_RTM_ADMISSION_METADATA_KEY]?.value,
		);
	};

	const ensureLock = async (lockName: string) => {
		const response = await rtm.lock.getLock(
			channelName,
			AGORA_RTM_CHANNEL_TYPE,
		);
		if (lockExists(lockName, response.lockDetails)) {
			return;
		}
		await rtm.lock.setLock(channelName, AGORA_RTM_CHANNEL_TYPE, lockName, {
			ttl: 10,
		});
	};

		const setMetadata = async (
			metadata: SttRoomMetadata,
			lockName = AGORA_RTM_STT_LOCK_NAME,
		) => {
			await rtm.storage.setChannelMetadata(
				channelName,
				AGORA_RTM_CHANNEL_TYPE,
				[
					createMetadataItem({
						key: AGORA_RTM_ROOM_METADATA_KEY,
						value: stringifyRoomMetadata(metadata),
						revision: -1,
					}),
				],
				{ majorRevision: -1, lockName },
			);
			onMetadata(metadata);
		};

		const setAdmissionMetadata = async (metadata: SttRoomAdmissionMetadata) => {
			await rtm.storage.setChannelMetadata(
				channelName,
				AGORA_RTM_CHANNEL_TYPE,
				[
					createMetadataItem({
						key: AGORA_RTM_ADMISSION_METADATA_KEY,
						value: stringifyRoomAdmissionMetadata(metadata),
						revision: -1,
					}),
				],
				{ majorRevision: -1, lockName: AGORA_RTM_ADMISSION_LOCK_NAME },
			);
		};

	const releaseAdmissionSlot = async () => {
		await ensureLock(AGORA_RTM_ADMISSION_LOCK_NAME);
		await rtm.lock.acquireLock(
			channelName,
			AGORA_RTM_CHANNEL_TYPE,
			AGORA_RTM_ADMISSION_LOCK_NAME,
			{ retry: false },
		);
		try {
			const currentParticipantUserIds =
				(await getAdmissionMetadata()).participantUserIds;
			const nextParticipantUserIds = currentParticipantUserIds.filter(
				(participantUserId) => participantUserId !== userId,
			);
			if (currentParticipantUserIds.length === nextParticipantUserIds.length) {
				return;
			}
			await setAdmissionMetadata({
				participantUserIds: nextParticipantUserIds,
			});
		} finally {
			await rtm.lock
				.releaseLock(
					channelName,
					AGORA_RTM_CHANNEL_TYPE,
					AGORA_RTM_ADMISSION_LOCK_NAME,
				)
				.catch(() => undefined);
		}
	};

	await ensureLock(AGORA_RTM_ADMISSION_LOCK_NAME);
	await rtm.lock.acquireLock(
			channelName,
			AGORA_RTM_CHANNEL_TYPE,
			AGORA_RTM_ADMISSION_LOCK_NAME,
			{ retry: false },
		);
	try {
		const currentParticipantUserIds =
			(await getAdmissionMetadata()).participantUserIds;
		const nextParticipantUserIds = currentParticipantUserIds.includes(userId)
			? currentParticipantUserIds
			: [...currentParticipantUserIds, userId];
		if (
			!currentParticipantUserIds.includes(userId) &&
			isParticipantLimitReached(currentParticipantUserIds.length)
		) {
			throw new Error(getParticipantLimitReachedMessage());
		}
		await setAdmissionMetadata({
			participantUserIds: nextParticipantUserIds,
		});
		try {
			await runPresenceOperationWithRetry(() =>
				rtm.presence.setState(channelName, AGORA_RTM_CHANNEL_TYPE, {
					...localMemberState,
				}),
			);
			localPresencePublished = true;
			upsertLocalMember();
			emitMembers();
			upsertMembers(
				(
					await runPresenceOperationWithRetry(() =>
						rtm.presence.getOnlineUsers(channelName, AGORA_RTM_CHANNEL_TYPE, {
							includeState: true,
						}),
					)
				).userStateList ?? [],
			);
		} catch (error) {
			await setAdmissionMetadata({
				participantUserIds: currentParticipantUserIds,
			});
			throw error;
		}
	} finally {
		await rtm.lock
			.releaseLock(
				channelName,
				AGORA_RTM_CHANNEL_TYPE,
				AGORA_RTM_ADMISSION_LOCK_NAME,
			)
			.catch(() => undefined);
	}

	const ensureSttLock = async () => {
		await ensureLock(AGORA_RTM_STT_LOCK_NAME);
	};

	onMetadata(await getMetadata());

	return {
		getMetadata,
		setMetadata,
		withSttLock: async (operation) => {
			await ensureSttLock();
			await rtm.lock.acquireLock(
				channelName,
				AGORA_RTM_CHANNEL_TYPE,
				AGORA_RTM_STT_LOCK_NAME,
				{ retry: false },
			);
			try {
				return await operation();
			} finally {
				await rtm.lock
					.releaseLock(
						channelName,
						AGORA_RTM_CHANNEL_TYPE,
						AGORA_RTM_STT_LOCK_NAME,
					)
					.catch(() => undefined);
			}
		},
		leave: async () => {
			await releaseAdmissionSlot().catch(() => undefined);
			localPresencePublished = false;
			members.delete(userId);
			await rtm.presence
				.removeState(channelName, AGORA_RTM_CHANNEL_TYPE)
				.catch(() => undefined);
			await rtm.unsubscribe(channelName).catch(() => undefined);
			await rtm.logout().catch(() => undefined);
		},
	};
};

export const joinMobileViewerRtmSession = async ({
	appId,
	userId,
	token,
	channelName,
	onMembers,
}: MobileViewerRtmOptions): Promise<MobileViewerRtmSession> => {
	configureAgoraRtmChinaArea(AgoraRTM);
	const rtm = new RTM(appId, userId, RTM_CONFIG);
	const members = new Map<string, SttRoomMember>();

	const emitMembers = () => onMembers([...members.values()]);
	const upsertMembers = (
		users: Array<{ userId?: string; states?: Record<string, string> }> = [],
	) => {
		for (const user of users) {
			if (!user.userId) {
				continue;
			}
			members.set(user.userId, stateToMember(user.userId, user.states));
		}
		emitMembers();
	};

	const removeMembers = (users: Array<{ userId?: string }> = []) => {
		for (const user of users) {
			if (user.userId) {
				members.delete(user.userId);
			}
		}
		emitMembers();
	};

	rtm.addEventListener("presence", (event: RtmPresenceEvent) => {
		if (event.channelName !== channelName) {
			return;
		}

		switch (event.eventType) {
			case "SNAPSHOT":
				members.clear();
				upsertMembers(event.snapshot ?? []);
				break;
			case "REMOTE_STATE_CHANGED":
				if (event.publisher) {
					upsertMembers([
						{ userId: event.publisher, states: event.stateChanged ?? {} },
					]);
				}
				break;
			case "REMOTE_JOIN":
				if (event.publisher) {
					upsertMembers([{ userId: event.publisher }]);
				}
				break;
			case "REMOTE_LEAVE":
			case "REMOTE_TIMEOUT":
				if (event.publisher) {
					removeMembers([{ userId: event.publisher }]);
				}
				break;
			default:
				if (event.snapshot) {
					members.clear();
					upsertMembers(event.snapshot);
				}
				break;
		}

		if (event.interval) {
			upsertMembers(normalizePresenceUserStates(event.interval.join));
			upsertMembers(event.interval.userStateList ?? []);
			removeMembers(normalizePresenceUserStates(event.interval.leave));
			removeMembers(normalizePresenceUserStates(event.interval.timeout));
		}
	});

	await rtm.login(token ? { token } : {});
	const presenceReadyChannelName = createPresenceReadyChannelName(userId);
	const presenceReady = waitForPresenceSnapshot(rtm, presenceReadyChannelName);
	await rtm.subscribe(presenceReadyChannelName, {
		withMessage: false,
		withPresence: true,
		beQuiet: true,
	});
	await presenceReady;
	await rtm.unsubscribe(presenceReadyChannelName).catch(() => undefined);

	await rtm.subscribe(channelName, {
		withMessage: false,
		withPresence: true,
	});

	const onlineUsers = await runPresenceOperationWithRetry(() =>
		rtm.presence.getOnlineUsers(channelName, AGORA_RTM_CHANNEL_TYPE, {
			includeState: true,
		}),
	);
	upsertMembers(onlineUsers.userStateList ?? []);

	return {
		leave: async () => {
			await rtm.unsubscribe(channelName).catch(() => undefined);
			await rtm.logout().catch(() => undefined);
		},
	};
};
