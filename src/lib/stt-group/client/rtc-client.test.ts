import { afterEach, describe, expect, it, vi } from "vitest";
import { installSubtitleDebugConsoleApi } from "./subtitle-debug";

const rtcMocks = vi.hoisted(() => ({
	join: vi.fn(
		async (
			_appId: string,
			_channel: string,
			_token: string | null,
			uid: number,
		) => uid,
	),
	publish: vi.fn(async () => undefined),
	on: vi.fn(),
	leave: vi.fn(async () => undefined),
	subscribe: vi.fn(async () => undefined),
	unsubscribe: vi.fn(async () => undefined),
	unpublish: vi.fn(async () => undefined),
	setArea: vi.fn(),
	createMicrophoneAudioTrack: vi.fn(async () => ({
		setEnabled: vi.fn(async () => undefined),
		close: vi.fn(),
	})),
}));

const decoderMocks = vi.hoisted(() => ({
	decodeSttTextMessage: vi.fn(() => ({
		uid: "pb",
		dataType: "transcribe",
		words: [{ text: "pb", isFinal: true }],
		trans: [],
		payloadFormat: "pb",
	})),
	decodeJsonSttMessage: vi.fn(() => [
		{
			uid: "json",
			dataType: "transcribe",
			words: [{ text: "json", isFinal: true }],
			trans: [],
			payloadFormat: "json",
		},
	]),
}));

vi.mock("agora-rtc-sdk-ng", () => ({
	default: {
		AREAS: {
			CHINA: "CHINA",
		},
		createClient: vi.fn(() => ({
			join: rtcMocks.join,
			publish: rtcMocks.publish,
			on: rtcMocks.on,
			leave: rtcMocks.leave,
			subscribe: rtcMocks.subscribe,
			unsubscribe: rtcMocks.unsubscribe,
			unpublish: rtcMocks.unpublish,
		})),
		setArea: rtcMocks.setArea,
		createMicrophoneAudioTrack: rtcMocks.createMicrophoneAudioTrack,
		createCameraVideoTrack: vi.fn(),
		setParameter: vi.fn(),
	},
}));

vi.mock("./stt-message-decoder", () => ({
	decodeSttTextMessage: decoderMocks.decodeSttTextMessage,
}));

vi.mock("./stt-json-message-decoder", () => ({
	decodeJsonSttMessage: decoderMocks.decodeJsonSttMessage,
}));

import { joinGroupRtcSession, listAvailableMediaDevices } from "./rtc-client";

describe("joinGroupRtcSession", () => {
	const flushMicrotasks = () => Promise.resolve();

	afterEach(() => {
		vi.clearAllMocks();
		vi.unstubAllGlobals();
	});

	it("does not create or publish local tracks in viewer mode", async () => {
		await joinGroupRtcSession({
			appId: "app-id",
			channelName: "stt-room-1",
			uid: 100001,
			token: "rtc-token",
			pubBotUid: "2000",
			mode: "viewer",
			onSubtitle: vi.fn(),
		});

		expect(rtcMocks.createMicrophoneAudioTrack).not.toHaveBeenCalled();
		expect(rtcMocks.publish).not.toHaveBeenCalled();
	});

	it("continues to publish microphone audio in participant mode", async () => {
		await joinGroupRtcSession({
			appId: "app-id",
			channelName: "stt-room-1",
			uid: 100001,
			token: "rtc-token",
			pubBotUid: "2000",
			mode: "participant",
			onSubtitle: vi.fn(),
		});

		expect(rtcMocks.createMicrophoneAudioTrack).toHaveBeenCalledTimes(1);
		expect(rtcMocks.publish).toHaveBeenCalledTimes(1);
	});

	it("does not publish microphone audio when participant joins with microphone disabled", async () => {
		await joinGroupRtcSession({
			appId: "app-id",
			channelName: "stt-room-1",
			uid: 100001,
			token: "rtc-token",
			pubBotUid: "2000",
			mode: "participant",
			initialMicrophoneEnabled: false,
			onSubtitle: vi.fn(),
		});

		expect(rtcMocks.createMicrophoneAudioTrack).not.toHaveBeenCalled();
		expect(rtcMocks.publish).not.toHaveBeenCalled();
	});

	it("creates and publishes microphone audio when an initially disabled participant unmutes", async () => {
		const session = await joinGroupRtcSession({
			appId: "app-id",
			channelName: "stt-room-1",
			uid: 100001,
			token: "rtc-token",
			pubBotUid: "2000",
			mode: "participant",
			initialMicrophoneEnabled: false,
			onSubtitle: vi.fn(),
		});

		await session.setMicrophoneMuted(false);

		expect(rtcMocks.createMicrophoneAudioTrack).toHaveBeenCalledTimes(1);
		expect(rtcMocks.publish).toHaveBeenCalledTimes(1);
	});

	it("lists available microphone and camera devices", async () => {
		vi.stubGlobal("navigator", {
			mediaDevices: {
				enumerateDevices: vi.fn(async () => [
					{
						kind: "audioinput",
						deviceId: "mic-1",
						label: "Shure MV7",
					},
					{
						kind: "videoinput",
						deviceId: "cam-1",
						label: "Sony ZV-E10",
					},
				]),
			},
		});

		const result = await listAvailableMediaDevices();

		expect(result.microphones).toEqual([
			{ deviceId: "mic-1", label: "Shure MV7" },
		]);
		expect(result.cameras).toEqual([
			{ deviceId: "cam-1", label: "Sony ZV-E10" },
		]);
	});

	it("uses the pb decoder by default for subtitle stream messages", async () => {
		const onSubtitle = vi.fn();
		await joinGroupRtcSession({
			appId: "app-id",
			channelName: "stt-room-1",
			uid: 100001,
			token: "rtc-token",
			pubBotUid: "2000",
			mode: "viewer",
			onSubtitle,
		});

		const streamHandler = rtcMocks.on.mock.calls.find(
			([eventName]) => eventName === "stream-message",
		)?.[1] as ((senderUid: number, stream: Uint8Array) => void) | undefined;

		expect(streamHandler).toBeTypeOf("function");
		await streamHandler?.(2000, new TextEncoder().encode('{"asr_results":{}}'));
		await flushMicrotasks();

		expect(decoderMocks.decodeSttTextMessage).toHaveBeenCalledTimes(1);
		expect(decoderMocks.decodeJsonSttMessage).not.toHaveBeenCalled();
		expect(onSubtitle).toHaveBeenCalledWith(
			expect.objectContaining({ payloadFormat: "pb" }),
		);
	});

	it("uses the json decoder when the subtitle message format is json", async () => {
		const onSubtitle = vi.fn();
		await joinGroupRtcSession({
			appId: "app-id",
			channelName: "stt-room-1",
			uid: 100001,
			token: "rtc-token",
			pubBotUid: "2000",
			mode: "viewer",
			subtitleMessageFormat: "json",
			onSubtitle,
		});

		const streamHandler = rtcMocks.on.mock.calls.find(
			([eventName]) => eventName === "stream-message",
		)?.[1] as ((senderUid: number, stream: Uint8Array) => void) | undefined;

		expect(streamHandler).toBeTypeOf("function");
		await streamHandler?.(2000, new TextEncoder().encode('{"asr_results":{}}'));
		await flushMicrotasks();

		expect(decoderMocks.decodeJsonSttMessage).toHaveBeenCalledTimes(1);
		expect(decoderMocks.decodeSttTextMessage).not.toHaveBeenCalled();
		expect(onSubtitle).toHaveBeenCalledWith(
			expect.objectContaining({ payloadFormat: "json" }),
		);
	});

	it("falls back to the pb decoder when json parsing fails", async () => {
		decoderMocks.decodeJsonSttMessage.mockImplementationOnce(() => {
			throw new SyntaxError("Unexpected token");
		});

		const onSubtitle = vi.fn();
		await joinGroupRtcSession({
			appId: "app-id",
			channelName: "stt-room-1",
			uid: 100001,
			token: "rtc-token",
			pubBotUid: "2000",
			mode: "viewer",
			subtitleMessageFormat: "json",
			onSubtitle,
		});

		const streamHandler = rtcMocks.on.mock.calls.find(
			([eventName]) => eventName === "stream-message",
		)?.[1] as ((senderUid: number, stream: Uint8Array) => void) | undefined;

		expect(streamHandler).toBeTypeOf("function");
		await streamHandler?.(2000, new TextEncoder().encode("{bad-json"));
		await flushMicrotasks();

		expect(decoderMocks.decodeJsonSttMessage).toHaveBeenCalledTimes(1);
		expect(decoderMocks.decodeSttTextMessage).toHaveBeenCalledTimes(1);
		expect(onSubtitle).toHaveBeenCalledWith(
			expect.objectContaining({ payloadFormat: "pb" }),
		);
	});

	it("skips the json decoder when the payload clearly is not json", async () => {
		const onSubtitle = vi.fn();
		await joinGroupRtcSession({
			appId: "app-id",
			channelName: "stt-room-1",
			uid: 100001,
			token: "rtc-token",
			pubBotUid: "2000",
			mode: "viewer",
			subtitleMessageFormat: "json",
			onSubtitle,
		});

		const streamHandler = rtcMocks.on.mock.calls.find(
			([eventName]) => eventName === "stream-message",
		)?.[1] as ((senderUid: number, stream: Uint8Array) => void) | undefined;

		expect(streamHandler).toBeTypeOf("function");
		await streamHandler?.(2000, new Uint8Array([0x89, 0x01, 0x02, 0x03]));
		await flushMicrotasks();

		expect(decoderMocks.decodeJsonSttMessage).not.toHaveBeenCalled();
		expect(decoderMocks.decodeSttTextMessage).toHaveBeenCalledTimes(1);
		expect(onSubtitle).toHaveBeenCalledWith(
			expect.objectContaining({ payloadFormat: "pb" }),
		);
	});

	it("decompresses gzip payloads before using the json decoder", async () => {
		const jsonPayload = new TextEncoder().encode(
			'{"asr_results":{"results":[{"text":"你好","final":true}]}}',
		);

		class FakeDecompressionStream {
			constructor(_format: string) {}
		}

		vi.stubGlobal("DecompressionStream", FakeDecompressionStream);
		vi.stubGlobal(
			"Blob",
			class FakeBlob {
				constructor(_parts: unknown[]) {}
				stream() {
					return {
						pipeThrough() {
							return "fake-decompressed-stream";
						},
					};
				}
			} as unknown as typeof Blob,
		);
		vi.stubGlobal(
			"Response",
			class FakeResponse {
				constructor(_body: unknown) {}
				arrayBuffer() {
					return Promise.resolve(
						jsonPayload.buffer.slice(
							jsonPayload.byteOffset,
							jsonPayload.byteOffset + jsonPayload.byteLength,
						),
					);
				}
			} as unknown as typeof Response,
		);

		const onSubtitle = vi.fn();
		await joinGroupRtcSession({
			appId: "app-id",
			channelName: "stt-room-1",
			uid: 100001,
			token: "rtc-token",
			pubBotUid: "2000",
			mode: "viewer",
			subtitleMessageFormat: "json",
			onSubtitle,
		});

		const streamHandler = rtcMocks.on.mock.calls.find(
			([eventName]) => eventName === "stream-message",
		)?.[1] as
			| ((senderUid: number, stream: Uint8Array) => Promise<void>)
			| undefined;

		expect(streamHandler).toBeTypeOf("function");
		await streamHandler?.(2000, new Uint8Array([0x1f, 0x8b, 0x08, 0x00]));

		expect(decoderMocks.decodeJsonSttMessage).toHaveBeenCalledTimes(1);
		expect(decoderMocks.decodeJsonSttMessage).toHaveBeenCalledWith(
			expect.any(Uint8Array),
		);
		expect(decoderMocks.decodeSttTextMessage).not.toHaveBeenCalled();
		expect(onSubtitle).toHaveBeenCalledWith(
			expect.objectContaining({ payloadFormat: "json" }),
		);
	});

	it("logs stream preview details only after raw subtitle logging is enabled", async () => {
		const onSubtitle = vi.fn();
		const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

		await joinGroupRtcSession({
			appId: "app-id",
			channelName: "stt-room-1",
			uid: 100001,
			token: "rtc-token",
			pubBotUid: "2000",
			mode: "viewer",
			onSubtitle,
		});

		const streamHandler = rtcMocks.on.mock.calls.find(
			([eventName]) => eventName === "stream-message",
		)?.[1] as ((senderUid: number, stream: Uint8Array) => void) | undefined;

		expect(streamHandler).toBeTypeOf("function");

		await streamHandler?.(2000, new Uint8Array([0x08, 0x7b, 0x10, 0x01]));
		await flushMicrotasks();
		expect(infoSpy).not.toHaveBeenCalled();

		installSubtitleDebugConsoleApi().enableRawSubtitleLogging();
		await streamHandler?.(2000, new Uint8Array([0x08, 0x7b, 0x10, 0x01]));
		await flushMicrotasks();

		expect(infoSpy).toHaveBeenCalledWith(
			"[subtitle-debug] incoming subtitle stream",
			expect.objectContaining({
				senderUid: "2000",
				requestedFormat: "pb",
				byteLength: 4,
				previewBytes: [0x08, 0x7b, 0x10, 0x01],
			}),
		);
	});
});
