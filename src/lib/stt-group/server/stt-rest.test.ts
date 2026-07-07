import { afterEach, describe, expect, it, vi } from "vitest";
import { startSttSession } from "./stt-rest";

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

describe("startSttSession", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
	});

	it("calls Shengwang join with one source and many target languages", async () => {
		for (const [key, value] of Object.entries(env)) {
			vi.stubEnv(key, value);
		}
		const fetchMock = vi.fn(async () =>
			Response.json({ agent_id: "agent-1", create_ts: 1, status: "RUNNING" }),
		);
		const infoSpy = vi
			.spyOn(console, "info")
			.mockImplementation(() => undefined);
		vi.stubGlobal("fetch", fetchMock);

		const result = await startSttSession({
			channelName: "room-a",
			controllerUserId: "controller-a",
			controllerName: "Controller A",
			recognitionMode: "single",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US", "ja-JP", "de-DE"],
		});

		expect(result).toMatchObject({
			appId: "app-id",
			agentId: "agent-1",
			controllerUserId: "controller-a",
			recognitionMode: "single",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US", "ja-JP", "de-DE"],
		});
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe("https://stt.example.com/root/projects/app-id/join");
		expect(init?.method).toBe("POST");
		const body = JSON.parse(String(init?.body));
		expect(body.languages).toEqual(["zh-CN"]);
		expect(body.keywords).toEqual(["声网", "Agora", "实时互动"]);
		expect(body.graph_id).toBe("graph-1");
		expect(body.maxIdleTime).toBe(300);
		expect(body.translateConfig.languages).toEqual([
			{ source: "zh-CN", target: ["en-US", "ja-JP", "de-DE"] },
		]);
		expect(body.translateConfig.forceTranslateInterval).toBe(2);
		expect(body.captionConfig).toEqual({
			sliceDuration: 300,
			storage: {
				vendor: 2,
				region: 1,
				bucket: "caption-bucket",
				accessKey: "caption-ak",
				secretKey: "caption-sk",
				fileNamePrefix: [
					"sttdemo",
					"captions",
					"rooma",
					expect.stringMatching(/^[A-Za-z0-9]+$/),
				],
			},
		});
		expect(body.rtcConfig.channelName).toBe("room-a");
		expect(body.rtcConfig.subBotUid).toBe("1000");
		expect(body.rtcConfig.pubBotUid).toBe("2000");
		expect(body.rtcConfig.enableJsonProtocol).toBeUndefined();
		expect(body.rtcConfig.subBotToken).toBeTruthy();
		expect(body.rtcConfig.pubBotToken).toBeTruthy();
		expect(init?.headers).toMatchObject({
			Authorization: `Basic ${Buffer.from("app-id:app-cert").toString(
				"base64",
			)}`,
		});
		expect(infoSpy).toHaveBeenCalledTimes(1);
		const [loggedMessage] = infoSpy.mock.calls[0] ?? [];
		expect(typeof loggedMessage).toBe("string");
		expect(loggedMessage).toContain("[stt-demo] Shengwang STT join request {");
		expect(loggedMessage).toContain(
			'"url": "https://stt.example.com/root/projects/app-id/join"',
		);
		expect(loggedMessage).toContain('"method": "POST"');
		expect(loggedMessage).toContain('"Authorization": "Basic [REDACTED]"');
		expect(loggedMessage).toContain('"Content-Type": "application/json"');
		expect(loggedMessage).toContain('"languages": [');
		expect(loggedMessage).toContain('"zh-CN"');
		expect(loggedMessage).toContain('"keywords": [');
		expect(loggedMessage).toContain('"graph_id": "graph-1"');
		expect(loggedMessage).toContain('"channelName": "room-a"');
		expect(loggedMessage).toContain('"subBotUid": "1000"');
		expect(loggedMessage).toContain('"pubBotUid": "2000"');
		expect(loggedMessage).toContain('"forceTranslateInterval": 2');
		expect(loggedMessage).toContain('"target": [');
		expect(loggedMessage).toContain('"en-US"');
		expect(loggedMessage).toContain('"ja-JP"');
		expect(loggedMessage).toContain('"de-DE"');
	});

	it("calls Shengwang join with many source and many target languages", async () => {
		for (const [key, value] of Object.entries(env)) {
			vi.stubEnv(key, value);
		}
		const fetchMock = vi.fn(async () =>
			Response.json({ agent_id: "agent-1", create_ts: 1, status: "RUNNING" }),
		);
		vi.stubGlobal("fetch", fetchMock);

		await startSttSession({
			channelName: "room-a",
			controllerUserId: "controller-a",
			controllerName: "Controller A",
			recognitionMode: "multi",
			sourceLanguages: ["zh-CN", "en-US"],
			targetLanguages: ["zh-CN", "en-US", "ja-JP", "de-DE"],
		});

		const [, init] = fetchMock.mock.calls[0];
		const body = JSON.parse(String(init?.body));
		expect(body.languages).toEqual(["zh-CN", "en-US"]);
		expect(body.translateConfig.languages).toEqual([
			{
				source: "zh-CN",
				target: ["zh-CN", "en-US", "ja-JP", "de-DE"],
			},
			{
				source: "en-US",
				target: ["zh-CN", "en-US", "ja-JP", "de-DE"],
			},
		]);
	});

	it("uses vendor code 1 for aws caption storage", async () => {
		for (const [key, value] of Object.entries({
			...env,
			AGORA_STT_CAPTION_PROVIDER: "aws",
			AGORA_STT_CAPTION_REGION: "8",
		})) {
			vi.stubEnv(key, value);
		}
		const fetchMock = vi.fn(async () =>
			Response.json({ agent_id: "agent-1", create_ts: 1, status: "RUNNING" }),
		);
		vi.stubGlobal("fetch", fetchMock);

		await startSttSession({
			channelName: "room-a",
			controllerUserId: "controller-a",
			controllerName: "Controller A",
			recognitionMode: "single",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US"],
		});

		const [, init] = fetchMock.mock.calls[0];
		const body = JSON.parse(String(init?.body));
		expect(body.captionConfig.storage.vendor).toBe(1);
		expect(body.captionConfig.storage.region).toBe(8);
	});

	it("starts STT without captionConfig when OSS env is not configured", async () => {
		for (const [key, value] of Object.entries(env)) {
			if (!key.startsWith("AGORA_STT_CAPTION_")) {
				vi.stubEnv(key, value);
			} else {
				vi.stubEnv(key, "");
			}
		}
		const fetchMock = vi.fn(async () =>
			Response.json({ agent_id: "agent-1", create_ts: 1, status: "RUNNING" }),
		);
		vi.stubGlobal("fetch", fetchMock);

		await startSttSession({
			channelName: "room-a",
			controllerUserId: "controller-a",
			controllerName: "Controller A",
			recognitionMode: "single",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US"],
		});

		const [, init] = fetchMock.mock.calls[0];
		const body = JSON.parse(String(init?.body));
		expect(body.captionConfig).toBeUndefined();
		expect(body.rtcConfig.channelName).toBe("room-a");
		expect(body.translateConfig.languages).toEqual([
			{ source: "zh-CN", target: ["en-US"] },
		]);
	});

	it("calls Shengwang join with auto recognition when the controller picks auto mode", async () => {
		for (const [key, value] of Object.entries(env)) {
			vi.stubEnv(key, value);
		}
		const fetchMock = vi.fn(async () =>
			Response.json({ agent_id: "agent-1", create_ts: 1, status: "RUNNING" }),
		);
		vi.stubGlobal("fetch", fetchMock);

		const result = await startSttSession({
			channelName: "room-a",
			controllerUserId: "controller-a",
			controllerName: "Controller A",
			recognitionMode: "auto",
			sourceLanguages: [],
			targetLanguages: ["ja-JP", "en-US"],
		});

		expect(result.recognitionMode).toBe("auto");
		expect(result.sourceLanguages).toEqual(["auto"]);
		expect(result.targetLanguages).toEqual(["ja-JP", "en-US"]);
		const [, init] = fetchMock.mock.calls[0];
		const body = JSON.parse(String(init?.body));
		expect(body.languages).toEqual(["auto"]);
		expect(body.translateConfig.languages).toEqual([
			{ source: "auto", target: ["ja-JP", "en-US"] },
		]);
	});

	it("sets rtcConfig.enableJsonProtocol when requested", async () => {
		for (const [key, value] of Object.entries(env)) {
			vi.stubEnv(key, value);
		}
		const fetchMock = vi.fn(async () =>
			Response.json({ agent_id: "agent-1", create_ts: 1, status: "RUNNING" }),
		);
		vi.stubGlobal("fetch", fetchMock);

		await startSttSession({
			channelName: "room-a",
			controllerUserId: "controller-a",
			controllerName: "Controller A",
			recognitionMode: "single",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US"],
			enableJsonProtocol: true,
		});

		const [, init] = fetchMock.mock.calls[0];
		const body = JSON.parse(String(init?.body));
		expect(body.rtcConfig.enableJsonProtocol).toBe(true);
	});

	it("does not send extensionParams when sttVendor is undefined", async () => {
		for (const [key, value] of Object.entries(env)) {
			vi.stubEnv(key, value);
		}
		const fetchMock = vi.fn(async () =>
			Response.json({ agent_id: "agent-1", create_ts: 1, status: "RUNNING" }),
		);
		vi.stubGlobal("fetch", fetchMock);

		await startSttSession({
			channelName: "room-a",
			controllerUserId: "controller-a",
			controllerName: "Controller A",
			recognitionMode: "single",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US"],
		});

		const [, init] = fetchMock.mock.calls[0];
		const body = JSON.parse(String(init?.body));
		expect(body.extensionParams).toBeUndefined();
	});

	it("sends extensionParams.asr.vendor when sttVendor is present", async () => {
		for (const [key, value] of Object.entries({
			...env,
			VITE_STT_VENDOR_OPTIONS: "agora,soniox",
		})) {
			vi.stubEnv(key, value);
		}
		const fetchMock = vi.fn(async () =>
			Response.json({ agent_id: "agent-1", create_ts: 1, status: "RUNNING" }),
		);
		vi.stubGlobal("fetch", fetchMock);

		await startSttSession({
			channelName: "room-a",
			controllerUserId: "controller-a",
			controllerName: "Controller A",
			recognitionMode: "single",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US"],
			sttVendor: "soniox",
		});

		const [, init] = fetchMock.mock.calls[0];
		const body = JSON.parse(String(init?.body));
		expect(body.extensionParams).toEqual({
			enable_dump: true,
			dump_level: "full",
			asr: {
				vendor: "soniox",
			},
		});
	});

	it("uses explicit customer credentials for STT REST auth when present", async () => {
		for (const [key, value] of Object.entries({
			...env,
			AGORA_CUSTOMER_KEY: "customer-key",
			AGORA_CUSTOMER_SECRET: "customer-secret",
		})) {
			vi.stubEnv(key, value);
		}
		const fetchMock = vi.fn(async () =>
			Response.json({ agent_id: "agent-1", create_ts: 1, status: "RUNNING" }),
		);
		vi.stubGlobal("fetch", fetchMock);

		await startSttSession({
			channelName: "room-a",
			controllerUserId: "controller-a",
			controllerName: "Controller A",
			recognitionMode: "single",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US"],
		});

		const [, init] = fetchMock.mock.calls[0];
		expect(init?.headers).toMatchObject({
			Authorization: `Basic ${Buffer.from(
				"customer-key:customer-secret",
			).toString("base64")}`,
		});
	});

	it("uses explicit Basic Auth header before customer credentials", async () => {
		for (const [key, value] of Object.entries({
			...env,
			AGORA_STT_BASIC_AUTH: "Basic explicit-basic-token",
			AGORA_CUSTOMER_KEY: "customer-key",
			AGORA_CUSTOMER_SECRET: "customer-secret",
		})) {
			vi.stubEnv(key, value);
		}
		const fetchMock = vi.fn(async () =>
			Response.json({ agent_id: "agent-1", create_ts: 1, status: "RUNNING" }),
		);
		vi.stubGlobal("fetch", fetchMock);

		await startSttSession({
			channelName: "room-a",
			controllerUserId: "controller-a",
			controllerName: "Controller A",
			recognitionMode: "single",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US"],
		});

		const [, init] = fetchMock.mock.calls[0];
		expect(init?.headers).toMatchObject({
			Authorization: "Basic explicit-basic-token",
		});
	});

	it("omits STT bot tokens when the Agora app uses static key auth", async () => {
		for (const [key, value] of Object.entries({
			...env,
			AGORA_RTC_APP_CERTIFICATE: "",
			AGORA_STT_BASIC_AUTH: "Basic explicit-basic-token",
		})) {
			vi.stubEnv(key, value);
		}
		const fetchMock = vi.fn(async () =>
			Response.json({ agent_id: "agent-1", create_ts: 1, status: "RUNNING" }),
		);
		vi.stubGlobal("fetch", fetchMock);

		await startSttSession({
			channelName: "room-a",
			controllerUserId: "controller-a",
			controllerName: "Controller A",
			recognitionMode: "single",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US"],
		});

		const [, init] = fetchMock.mock.calls[0];
		const body = JSON.parse(String(init?.body));
		expect(body.rtcConfig.subBotUid).toBe("1000");
		expect(body.rtcConfig.pubBotUid).toBe("2000");
		expect(body.rtcConfig.subBotToken).toBeUndefined();
		expect(body.rtcConfig.pubBotToken).toBeUndefined();
		expect(init?.headers).toMatchObject({
			Authorization: "Basic explicit-basic-token",
		});
	});

	it("formats ServiceNotEnabled responses with actionable copy", async () => {
		for (const [key, value] of Object.entries(env)) {
			vi.stubEnv(key, value);
		}
		const fetchMock = vi.fn(async () =>
			Response.json(
				{
					detail: "This service is not enabled for the current project.",
					reason: "ServiceNotEnabled",
				},
				{ status: 403 },
			),
		);
		vi.stubGlobal("fetch", fetchMock);

		await expect(
			startSttSession({
				channelName: "room-a",
				controllerUserId: "controller-a",
				controllerName: "Controller A",
				recognitionMode: "single",
				sourceLanguages: ["zh-CN"],
				targetLanguages: ["en-US"],
			}),
		).rejects.toThrow(
			"当前声网项目未开通实时转写服务（ServiceNotEnabled），请在声网控制台为该 App ID 开通 STT 服务后重试。",
		);
	});

	it("keeps STT bound to the RTC app when RTM uses another app", async () => {
		for (const [key, value] of Object.entries({
			...env,
			VITE_AGORA_RTC_APP_ID: "rtc-app-id",
			AGORA_RTC_APP_CERTIFICATE: "rtc-app-cert",
			VITE_AGORA_RTM_APP_ID: "rtm-app-id",
			AGORA_RTM_APP_CERTIFICATE: "rtm-app-cert",
		})) {
			vi.stubEnv(key, value);
		}
		const fetchMock = vi.fn(async () =>
			Response.json({ agent_id: "agent-1", create_ts: 1, status: "RUNNING" }),
		);
		vi.stubGlobal("fetch", fetchMock);

		await startSttSession({
			channelName: "room-a",
			controllerUserId: "controller-a",
			controllerName: "Controller A",
			recognitionMode: "single",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US"],
		});

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe("https://stt.example.com/root/projects/rtc-app-id/join");
		expect(init?.headers).toMatchObject({
			Authorization: `Basic ${Buffer.from("rtc-app-id:rtc-app-cert").toString(
				"base64",
			)}`,
		});
		const body = JSON.parse(String(init?.body));
		expect(body.rtcConfig.subBotToken).toBeTruthy();
		expect(body.rtcConfig.pubBotToken).toBeTruthy();
	});

	it("uses a custom app id and custom base url when overrides are provided", async () => {
		for (const [key, value] of Object.entries(env)) {
			vi.stubEnv(key, value);
		}
		const fetchMock = vi.fn(async () =>
			Response.json({ agent_id: "agent-1", create_ts: 1, status: "RUNNING" }),
		);
		vi.stubGlobal("fetch", fetchMock);

		await startSttSession(
			{
				channelName: "room-a",
				controllerUserId: "controller-a",
				controllerName: "Controller A",
				recognitionMode: "single",
				sourceLanguages: ["zh-CN"],
				targetLanguages: ["en-US"],
			},
			{
				appId: "customappid",
				appCertificate: "app-cert",
				usesDynamicToken: true,
				sttRestAuthKey: "customappid",
				sttRestAuthSecret: "app-cert",
				sttRestBaseUrl: "https://custom.example.com/root",
				sttKeywords: ["声网", "Agora", "实时互动"],
				sttGraphId: "graph-1",
				sttForceTranslateIntervalSeconds: 2,
				subBotUid: "1000",
				pubBotUid: "2000",
				maxIdleTimeSeconds: 300,
				captionStorage: {
					provider: "aliyun",
					regionCode: 1,
					regionName: "oss-cn-shanghai",
					bucket: "caption-bucket",
					accessKey: "caption-ak",
					secretKey: "caption-sk",
					prefixRoot: "stt-demo/captions",
					sliceDuration: 300,
				},
				requestHeaders: {
					"X-Service-Namespace": "team-a",
				},
			},
		);

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe(
			"https://custom.example.com/root/projects/customappid/join",
		);
		expect(init?.headers).toMatchObject({
			"X-Service-Namespace": "team-a",
		});
	});
});
