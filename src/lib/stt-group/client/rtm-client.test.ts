import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockRtmState = vi.hoisted(() => {
	const rtmInstance = {
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		login: vi.fn(async () => undefined),
		logout: vi.fn(async () => undefined),
		subscribe: vi.fn(async () => undefined),
		unsubscribe: vi.fn(async () => undefined),
		presence: {
			setState: vi.fn(async () => undefined),
			removeState: vi.fn(async () => undefined),
			getOnlineUsers: vi.fn(async () => ({ userStateList: [] })),
		},
		storage: {
			getChannelMetadata: vi.fn(async () => ({ metadata: {} })),
			setChannelMetadata: vi.fn(async () => undefined),
		},
		lock: {
			getLock: vi.fn(async () => ({ lockDetails: [] })),
			setLock: vi.fn(async () => undefined),
			acquireLock: vi.fn(async () => undefined),
			releaseLock: vi.fn(async () => undefined),
		},
	};

	return {
		RTM: vi.fn(function MockRTM() {
			return rtmInstance;
		}),
		instance: rtmInstance,
	};
});

vi.mock("./rtm-presence-ready", () => ({
	createPresenceReadyChannelName: vi.fn(() => "presence-ready-room"),
	waitForPresenceSnapshot: vi.fn(async () => undefined),
	runPresenceOperationWithRetry: vi.fn(
		async (operation: () => Promise<unknown>) => operation(),
	),
}));

vi.mock("agora-rtm", () => ({
	default: {
		RTM: mockRtmState.RTM,
		setArea: vi.fn(),
		constantsType: {
			AreaCode: {
				CHINA: "CHINA",
			},
		},
	},
}));

import {
	AGORA_RTM_ADMISSION_LOCK_NAME,
	AGORA_RTM_STT_LOCK_NAME,
} from "../domain";
import {
	getParticipantLimitReachedMessage,
	MAX_GROUP_PARTICIPANTS,
} from "../room-settings";
import { joinGroupRtmSession, joinMobileViewerRtmSession } from "./rtm-client";

describe("joinGroupRtmSession", () => {
	beforeEach(() => {
		mockRtmState.instance.addEventListener.mockImplementation(
			(eventName, listener) => {
				if (eventName !== "presence") {
					return;
				}
				const channelName =
					mockRtmState.instance.subscribe.mock.calls.length === 0
						? "presence-ready-room"
						: "room-8";
				listener({
					channelName,
					snapshot: [],
				});
			},
		);
		mockRtmState.instance.removeEventListener.mockImplementation(
			(_eventName, _listener) => undefined,
		);
		mockRtmState.instance.presence.getOnlineUsers.mockResolvedValue({
			userStateList: [],
		});
		mockRtmState.instance.storage.getChannelMetadata.mockResolvedValue({
			metadata: {},
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("admits the eighth web participant under the admission lock", async () => {
		mockRtmState.instance.storage.getChannelMetadata.mockResolvedValueOnce({
			metadata: {
				sttRoomAdmission: {
					value: JSON.stringify({
						participantUserIds: Array.from(
							{ length: Math.max(0, MAX_GROUP_PARTICIPANTS - 1) },
							(_, index) => `user-${index + 1}`,
						),
					}),
				},
			},
		});

		await joinGroupRtmSession({
			appId: "rtm-app",
			userId: "100008",
			rtcUid: "100008",
			token: "rtm-token",
			channelName: "room-8",
			displayName: "User 8",
			onMembers: vi.fn(),
			onMetadata: vi.fn(),
		});

		expect(mockRtmState.instance.lock.acquireLock).toHaveBeenCalledWith(
			"room-8",
			"MESSAGE",
			AGORA_RTM_ADMISSION_LOCK_NAME,
			{ retry: false },
		);
		expect(
			mockRtmState.instance.storage.setChannelMetadata,
		).toHaveBeenCalledWith(
			"room-8",
			"MESSAGE",
			expect.any(Array),
			{ majorRevision: -1, lockName: AGORA_RTM_ADMISSION_LOCK_NAME },
		);
		expect(mockRtmState.instance.presence.setState).toHaveBeenCalledTimes(1);
		expect(mockRtmState.instance.lock.releaseLock).toHaveBeenCalledWith(
			"room-8",
			"MESSAGE",
			AGORA_RTM_ADMISSION_LOCK_NAME,
		);
	});

	it("wraps metadata writes with getKey/getValue/getRevision methods", async () => {
		mockRtmState.instance.storage.getChannelMetadata.mockResolvedValueOnce({
			metadata: {},
		});

		const session = await joinGroupRtmSession({
			appId: "rtm-app",
			userId: "100010",
			rtcUid: "100010",
			token: "rtm-token",
			channelName: "room-metadata-shape",
			displayName: "User 10",
			onMembers: vi.fn(),
			onMetadata: vi.fn(),
		});

		await session.setMetadata({
			status: "starting",
			controllerUserId: "100010",
		});

		const metadataItems = mockRtmState.instance.storage.setChannelMetadata.mock
			.calls.at(-1)?.[2] as Array<{
			getKey?: () => string;
			getValue?: () => string;
			getRevision?: () => number;
		}>;

		expect(metadataItems).toHaveLength(1);
		expect(typeof metadataItems?.[0]?.getKey).toBe("function");
		expect(typeof metadataItems?.[0]?.getValue).toBe("function");
		expect(typeof metadataItems?.[0]?.getRevision).toBe("function");
		expect(metadataItems?.[0]?.getKey?.()).toBe("sttRoom");
		expect(metadataItems?.[0]?.getRevision?.()).toBe(-1);
	});

	it("rejects the ninth web participant before publishing presence", async () => {
		mockRtmState.instance.storage.getChannelMetadata.mockResolvedValueOnce({
			metadata: {
				sttRoomAdmission: {
					value: JSON.stringify({
						participantUserIds: Array.from(
							{ length: MAX_GROUP_PARTICIPANTS },
							(_, index) => `user-${index + 1}`,
						),
					}),
				},
			},
		});

		await expect(
			joinGroupRtmSession({
				appId: "rtm-app",
				userId: "100009",
				rtcUid: "100009",
				token: "rtm-token",
				channelName: "room-8",
				displayName: "User 9",
				onMembers: vi.fn(),
				onMetadata: vi.fn(),
			}),
		).rejects.toThrow(
			getParticipantLimitReachedMessage(),
		);

		expect(mockRtmState.instance.presence.setState).not.toHaveBeenCalled();
		expect(mockRtmState.instance.lock.releaseLock).toHaveBeenCalledWith(
			"room-8",
			"MESSAGE",
			AGORA_RTM_ADMISSION_LOCK_NAME,
		);
	});

	it("releases the admission slot on leave", async () => {
		mockRtmState.instance.storage.getChannelMetadata
			.mockResolvedValueOnce({
				metadata: {
					sttRoomAdmission: {
						value: JSON.stringify({
							participantUserIds: [],
						}),
					},
				},
			})
			.mockResolvedValueOnce({
				metadata: {
					sttRoomAdmission: {
						value: JSON.stringify({
							participantUserIds: ["100002"],
						}),
					},
				},
			});

		const session = await joinGroupRtmSession({
			appId: "rtm-app",
			userId: "100002",
			rtcUid: "100002",
			token: "rtm-token",
			channelName: "room-1",
			displayName: "User 2",
			onMembers: vi.fn(),
			onMetadata: vi.fn(),
		});

		await session.leave();

		expect(mockRtmState.instance.storage.setChannelMetadata).toHaveBeenCalled();
		expect(
			mockRtmState.instance.storage.setChannelMetadata,
		).toHaveBeenLastCalledWith(
			"room-1",
			"MESSAGE",
			expect.any(Array),
			{ majorRevision: -1, lockName: AGORA_RTM_ADMISSION_LOCK_NAME },
		);
		expect(mockRtmState.instance.presence.removeState).toHaveBeenCalledWith(
			"room-1",
			"MESSAGE",
		);
	});

	it("keeps STT metadata writes on the STT lock", async () => {
		mockRtmState.instance.storage.getChannelMetadata.mockResolvedValueOnce({
			metadata: {},
		});

		const session = await joinGroupRtmSession({
			appId: "rtm-app",
			userId: "100003",
			rtcUid: "100003",
			token: "rtm-token",
			channelName: "room-stt-lock",
			displayName: "User 3",
			onMembers: vi.fn(),
			onMetadata: vi.fn(),
		});

		await session.setMetadata({
			status: "starting",
			controllerUserId: "100003",
		});

		expect(
			mockRtmState.instance.storage.setChannelMetadata,
		).toHaveBeenLastCalledWith(
			"room-stt-lock",
			"MESSAGE",
			[
				expect.objectContaining({
					key: "sttRoom",
				}),
			],
			{ majorRevision: -1, lockName: AGORA_RTM_STT_LOCK_NAME },
		);
	});

	it("rolls back the admission slot when publishing presence fails", async () => {
		mockRtmState.instance.storage.getChannelMetadata.mockResolvedValueOnce({
			metadata: {
				sttRoomAdmission: {
					value: JSON.stringify({
						participantUserIds: [],
					}),
				},
			},
		});
		mockRtmState.instance.presence.setState.mockRejectedValueOnce(
			new Error("presence failed"),
		);

		await expect(
			joinGroupRtmSession({
				appId: "rtm-app",
				userId: "100004",
				rtcUid: "100004",
				token: "rtm-token",
				channelName: "room-rollback",
				displayName: "User 4",
				onMembers: vi.fn(),
				onMetadata: vi.fn(),
			}),
		).rejects.toThrow("presence failed");

		expect(
			mockRtmState.instance.storage.setChannelMetadata,
		).toHaveBeenNthCalledWith(
			2,
			"room-rollback",
			"MESSAGE",
			expect.any(Array),
			{ majorRevision: -1, lockName: AGORA_RTM_ADMISSION_LOCK_NAME },
		);
	});
});

describe("joinMobileViewerRtmSession", () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it("does not publish viewer presence state", async () => {
		await joinMobileViewerRtmSession({
			appId: "rtm-app",
			userId: "viewer-1",
			token: "rtm-token",
			channelName: "room-8",
			onMembers: vi.fn(),
		});

		expect(mockRtmState.instance.presence.setState).not.toHaveBeenCalled();
	});
});
