import AgoraRTC, {
	type IAgoraRTCClient,
	type ICameraVideoTrack,
	type ILocalAudioTrack,
	type IRemoteAudioTrack,
	type IRemoteVideoTrack,
	type UID,
} from "agora-rtc-sdk-ng";
import type { DecodedSttTextMessage } from "../domain";
import { configureAgoraRtcChinaArea } from "./agora-area";
import { decodeJsonSttMessage } from "./stt-json-message-decoder";
import { decodeSttTextMessage } from "./stt-message-decoder";
import {
	installSubtitleDebugConsoleApi,
	logSubtitleDebug,
} from "./subtitle-debug";

export type RtcJoinMode = "participant" | "viewer";

type GroupRtcSessionOptions = {
	appId: string;
	channelName: string;
	uid: UID;
	token: string | null;
	pubBotUid?: string;
	mode?: RtcJoinMode;
	initialMicrophoneEnabled?: boolean;
	subtitleMessageFormat?: "pb" | "json";
	onSubtitle: (message: DecodedSttTextMessage) => void;
	onRemoteUsersChange?: (users: RemoteRtcUser[]) => void;
};

export type RemoteRtcUser = {
	uid: string;
	audioTrack?: IRemoteAudioTrack;
	videoTrack?: IRemoteVideoTrack;
};

export type GroupRtcSession = {
	client: IAgoraRTCClient;
	localUid: UID;
	setPubBotUid: (uid?: string) => void;
	setMicrophoneMuted: (muted: boolean) => Promise<void>;
	setCameraEnabled: (
		enabled: boolean,
		previewElement?: HTMLElement | null,
	) => Promise<void>;
	playLocalVideo: (previewElement: HTMLElement | null) => void;
	leave: () => Promise<void>;
};

export type LocalCameraPreviewSession = {
	play: (previewElement: HTMLElement | null) => void;
	close: () => void;
};

export type MediaDeviceOption = {
	deviceId: string;
	label: string;
};

export const listAvailableMediaDevices = async (): Promise<{
	microphones: MediaDeviceOption[];
	cameras: MediaDeviceOption[];
}> => {
	if (typeof navigator === "undefined" || !navigator.mediaDevices) {
		return {
			microphones: [],
			cameras: [],
		};
	}

	const devices = await navigator.mediaDevices.enumerateDevices();

	return {
		microphones: devices
			.filter((device) => device.kind === "audioinput")
			.map((device, index) => ({
				deviceId: device.deviceId,
				label: device.label || `Microphone ${index + 1}`,
			})),
		cameras: devices
			.filter((device) => device.kind === "videoinput")
			.map((device, index) => ({
				deviceId: device.deviceId,
				label: device.label || `Camera ${index + 1}`,
			})),
	};
};

export const createLocalCameraPreviewSession =
	async (): Promise<LocalCameraPreviewSession> => {
		configureAgoraRtcChinaArea(AgoraRTC);
		const cameraTrack = await AgoraRTC.createCameraVideoTrack();
		return {
			play: (previewElement) => {
				if (previewElement) {
					cameraTrack.play(previewElement, { fit: "cover" });
				}
			},
			close: () => {
				cameraTrack.stop();
				cameraTrack.close();
			},
		};
	};

export const joinGroupRtcSession = async ({
	appId,
	channelName,
	uid,
	token,
	pubBotUid,
	mode = "participant",
	initialMicrophoneEnabled = true,
	subtitleMessageFormat = "pb",
	onSubtitle,
	onRemoteUsersChange,
}: GroupRtcSessionOptions): Promise<GroupRtcSession> => {
	installSubtitleDebugConsoleApi();
	configureAgoraRtcChinaArea(AgoraRTC);
	AgoraRTC.setParameter("EXPERIMENTS", {
		enableStringuidCompatible: true,
	});

	const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
	let activePubBotUid = pubBotUid;
	let microphoneTrack: ILocalAudioTrack | null = null;
	let cameraTrack: ICameraVideoTrack | null = null;
	let isCameraPublished = false;
	const remoteUsers = new Map<string, RemoteRtcUser>();

	const emitRemoteUsers = () => {
		onRemoteUsersChange?.([...remoteUsers.values()]);
	};

	const upsertRemoteUser = (uid: UID, next: Partial<RemoteRtcUser>) => {
		const key = String(uid);
		remoteUsers.set(key, {
			...remoteUsers.get(key),
			uid: key,
			...next,
		});
		emitRemoteUsers();
	};

	const describeStreamPayload = (stream: Uint8Array) => {
		const previewBytes = Array.from(stream.slice(0, 16));
		const previewText = new TextDecoder().decode(stream.slice(0, 120));

		return {
			byteLength: stream.byteLength,
			previewBytes,
			previewText,
		};
	};

	const looksLikeJsonPayload = (stream: Uint8Array) => {
		const previewText = new TextDecoder().decode(stream.slice(0, 64));
		const firstNonWhitespaceCharacter = previewText.trimStart().at(0);

		return (
			firstNonWhitespaceCharacter === "{" || firstNonWhitespaceCharacter === "["
		);
	};

	const looksLikeGzipPayload = (stream: Uint8Array) =>
		stream.byteLength >= 2 && stream[0] === 0x1f && stream[1] === 0x8b;

	const gunzipPayload = async (stream: Uint8Array) => {
		if (typeof DecompressionStream === "undefined") {
			throw new Error("DecompressionStream is not available");
		}

		const decompressionStream = new DecompressionStream("gzip");
		const decompressedStream = new Blob([stream])
			.stream()
			.pipeThrough(decompressionStream);
		const arrayBuffer = await new Response(decompressedStream).arrayBuffer();
		return new Uint8Array(arrayBuffer);
	};

	const decodeSubtitleMessages = async (stream: Uint8Array) => {
		if (subtitleMessageFormat !== "json") {
			return [decodeSttTextMessage(stream)];
		}

		const candidateStream = looksLikeGzipPayload(stream)
			? await gunzipPayload(stream)
			: stream;

		if (!looksLikeJsonPayload(candidateStream)) {
			return [decodeSttTextMessage(stream)];
		}

		try {
			return decodeJsonSttMessage(candidateStream);
		} catch (error) {
			if (error instanceof SyntaxError) {
				return [decodeSttTextMessage(stream)];
			}
			throw error;
		}
	};

	client.on("user-published", async (user, mediaType) => {
		if (mode === "viewer") {
			return;
		}
		await client.subscribe(user, mediaType);
		if (mediaType === "audio") {
			user.audioTrack?.play();
			upsertRemoteUser(user.uid, { audioTrack: user.audioTrack });
			return;
		}
		if (mediaType === "video") {
			upsertRemoteUser(user.uid, { videoTrack: user.videoTrack });
		}
	});

	client.on("user-unpublished", async (user, mediaType) => {
		await client.unsubscribe(user, mediaType).catch(() => undefined);
		const key = String(user.uid);
		const currentUser = remoteUsers.get(key);
		if (!currentUser) {
			return;
		}

		if (mediaType === "audio") {
			remoteUsers.set(key, { ...currentUser, audioTrack: undefined });
			emitRemoteUsers();
			return;
		}

		currentUser.videoTrack?.stop();
		remoteUsers.set(key, { ...currentUser, videoTrack: undefined });
		emitRemoteUsers();
	});
	client.on("user-left", (user) => {
		const remoteUser = remoteUsers.get(String(user.uid));
		remoteUser?.videoTrack?.stop();
		remoteUsers.delete(String(user.uid));
		emitRemoteUsers();
	});
	client.on("stream-message", async (senderUid, stream) => {
		if (!activePubBotUid || String(senderUid) !== activePubBotUid) {
			return;
		}

		try {
			const looksLikeGzip = looksLikeGzipPayload(stream);
			logSubtitleDebug("incoming subtitle stream", {
				senderUid: String(senderUid),
				requestedFormat: subtitleMessageFormat,
				looksLikeGzip,
				looksLikeJson:
					subtitleMessageFormat === "json" && !looksLikeGzip
						? looksLikeJsonPayload(stream)
						: false,
				...describeStreamPayload(stream),
			});
			const messages = await decodeSubtitleMessages(stream);

			for (const message of messages) {
				onSubtitle(message);
			}
		} catch (error) {
			console.error("Failed to decode STT stream message", error);
		}
	});

	const ensureMicrophonePublished = async () => {
		if (mode === "viewer") {
			return;
		}
		if (!microphoneTrack) {
			microphoneTrack = await AgoraRTC.createMicrophoneAudioTrack();
		}
		await client.publish([microphoneTrack]);
	};

	const localUid = await client.join(appId, channelName, token, uid);
	if (mode === "participant" && initialMicrophoneEnabled) {
		microphoneTrack = await AgoraRTC.createMicrophoneAudioTrack();
		await client.publish([microphoneTrack]);
	}

	return {
		client,
		localUid,
		setPubBotUid: (nextUid) => {
			activePubBotUid = nextUid;
		},
		setMicrophoneMuted: async (muted) => {
			if (!muted && !microphoneTrack) {
				await ensureMicrophonePublished();
			}
			if (!microphoneTrack) {
				return;
			}
			await microphoneTrack?.setEnabled(!muted);
		},
		setCameraEnabled: async (enabled, previewElement) => {
			if (mode === "viewer") {
				return;
			}
			if (enabled) {
				if (!cameraTrack) {
					cameraTrack = await AgoraRTC.createCameraVideoTrack();
				}
				if (!isCameraPublished) {
					await client.publish([cameraTrack]);
					isCameraPublished = true;
				}
				if (previewElement) {
					cameraTrack.play(previewElement, { fit: "cover" });
				}
				return;
			}

			if (cameraTrack) {
				cameraTrack.stop();
				if (isCameraPublished) {
					await client.unpublish([cameraTrack]).catch(() => undefined);
					isCameraPublished = false;
				}
				cameraTrack.close();
				cameraTrack = null;
			}
		},
		playLocalVideo: (previewElement) => {
			if (mode === "viewer") {
				return;
			}
			if (cameraTrack && previewElement) {
				cameraTrack.play(previewElement, { fit: "cover" });
			}
		},
		leave: async () => {
			for (const remoteUser of remoteUsers.values()) {
				remoteUser.videoTrack?.stop();
			}
			remoteUsers.clear();
			emitRemoteUsers();
			if (cameraTrack) {
				cameraTrack.stop();
				if (isCameraPublished) {
					await client.unpublish([cameraTrack]).catch(() => undefined);
					isCameraPublished = false;
				}
				cameraTrack.close();
				cameraTrack = null;
			}
			if (microphoneTrack) {
				await client.unpublish([microphoneTrack]).catch(() => undefined);
				microphoneTrack.close();
				microphoneTrack = null;
			}
			await client.leave();
		},
	};
};
