import { describe, expect, it } from "vitest";
import {
	buildRtcTokenConfigWithOverrides,
	buildSttServerConfigWithOverrides,
	parseDeveloperOverrides,
} from "./request-overrides";

const env = {
	VITE_AGORA_RTC_APP_ID: "app-id",
	AGORA_RTC_APP_CERTIFICATE: "app-cert",
	AGORA_CUSTOMER_KEY: "",
	AGORA_CUSTOMER_SECRET: "",
	AGORA_STT_BASIC_AUTH: "",
	AGORA_STT_REST_BASE_URL: "https://stt.example.com/root/",
	AGORA_STT_SUB_BOT_UID: "1000",
	AGORA_STT_PUB_BOT_UID: "2000",
	AGORA_STT_MAX_IDLE_TIME_SECONDS: "300",
	AGORA_STT_KEYWORDS: "声网, Agora, 实时互动",
	AGORA_STT_GRAPH_ID: "graph-1",
	AGORA_STT_FORCE_TRANSLATE_INTERVAL_SECONDS: "2",
	AGORA_STT_CAPTION_PROVIDER: "aliyun",
	AGORA_STT_CAPTION_REGION: "1",
	AGORA_STT_CAPTION_BUCKET: "caption-bucket",
	AGORA_STT_CAPTION_ACCESS_KEY: "caption-ak",
	AGORA_STT_CAPTION_SECRET_KEY: "caption-sk",
	AGORA_STT_CAPTION_PREFIX_ROOT: "stt-demo/captions",
	AGORA_STT_CAPTION_SLICE_DURATION: "300",
};

describe("parseDeveloperOverrides", () => {
	it("returns empty overrides when applied is false", () => {
		expect(
			parseDeveloperOverrides({
				applied: false,
				customAppId: "customappid",
			}),
		).toEqual({});
	});

	it("normalizes valid overrides", () => {
		expect(
			parseDeveloperOverrides({
				applied: true,
				customAppId: "  customappid  ",
				requestBaseUrl: "https://stt.example.com/root///",
				xServiceNamespace: " team-a ",
			}),
		).toEqual({
			customAppId: "customappid",
			requestBaseUrl: "https://stt.example.com/root",
			xServiceNamespace: "team-a",
		});
	});

	it("rejects invalid request base urls", () => {
		expect(() =>
			parseDeveloperOverrides({
				applied: true,
				requestBaseUrl: "javascript:alert(1)",
			}),
		).toThrow("Invalid developer override: requestBaseUrl");
	});
});

describe("buildRtcTokenConfigWithOverrides", () => {
	it("builds RTC config with a custom app id while keeping the default certificate", () => {
		expect(
			buildRtcTokenConfigWithOverrides(env, {
				customAppId: "customappid",
			}),
		).toMatchObject({
			appId: "customappid",
			appCertificate: "app-cert",
		});
	});
});

describe("buildSttServerConfigWithOverrides", () => {
	it("builds STT config with custom base url and service namespace header", () => {
		expect(
			buildSttServerConfigWithOverrides(env, {
				requestBaseUrl: "https://custom.example.com/root",
				xServiceNamespace: "team-a",
			}),
		).toMatchObject({
			sttRestBaseUrl: "https://custom.example.com/root",
			requestHeaders: {
				"X-Service-Namespace": "team-a",
			},
		});
	});
});
