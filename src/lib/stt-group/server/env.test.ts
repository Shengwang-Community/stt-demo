import { describe, expect, it } from "vitest";
import { getAgoraServerConfig } from "./env";

const baseEnv = {
	VITE_AGORA_RTC_APP_ID: "app-id",
	AGORA_RTC_APP_CERTIFICATE: "app-cert",
	AGORA_STT_REST_BASE_URL: "https://stt.example.com/root/",
};

const captionEnv = {
	AGORA_STT_CAPTION_PROVIDER: "aliyun",
	AGORA_STT_CAPTION_REGION: "1",
	AGORA_STT_CAPTION_BUCKET: "caption-bucket",
	AGORA_STT_CAPTION_ACCESS_KEY: "caption-ak",
	AGORA_STT_CAPTION_SECRET_KEY: "caption-sk",
	AGORA_STT_CAPTION_PREFIX_ROOT: "stt-demo/captions",
	AGORA_STT_CAPTION_SLICE_DURATION: "300",
};

describe("getAgoraServerConfig caption storage", () => {
	it("keeps caption storage disabled when OSS env is not configured", () => {
		expect(getAgoraServerConfig(baseEnv).captionStorage).toBeUndefined();
	});

	it("builds caption storage when all required OSS env is configured", () => {
		expect(
			getAgoraServerConfig({
				...baseEnv,
				...captionEnv,
			}).captionStorage,
		).toMatchObject({
			provider: "aliyun",
			regionCode: 1,
			regionName: "oss-cn-shanghai",
			bucket: "caption-bucket",
			accessKey: "caption-ak",
			secretKey: "caption-sk",
			prefixRoot: "stt-demo/captions",
			sliceDuration: 300,
		});
	});

	it("rejects partial caption storage configuration", () => {
		expect(() =>
			getAgoraServerConfig({
				...baseEnv,
				AGORA_STT_CAPTION_PROVIDER: "aliyun",
				AGORA_STT_CAPTION_REGION: "1",
			}),
		).toThrow(
			"STT caption storage is partially configured; missing AGORA_STT_CAPTION_BUCKET, AGORA_STT_CAPTION_ACCESS_KEY, AGORA_STT_CAPTION_SECRET_KEY, AGORA_STT_CAPTION_PREFIX_ROOT",
		);
	});

	it("requires the RTC-specific Agora App ID", () => {
		expect(() =>
			getAgoraServerConfig({
				...baseEnv,
				VITE_AGORA_RTC_APP_ID: "",
			}),
		).toThrow("RTC Agora App ID is not configured");
	});
});
