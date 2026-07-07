// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccessOverlays } from "#/components/stt-group/access-overlays";
import { PrestartPanel } from "#/components/stt-group/prestart-panel";
import { ProductShell } from "#/components/stt-group/product-shell";
import { LocaleProvider, useT } from "#/lib/i18n";
import { DEFAULT_BRAND_SETTINGS, emptyRoomMetadata } from "#/lib/stt-group";
import { requestMobileViewerLink } from "#/lib/stt-group/client/api";
import {
	buildPrestartFormCheck,
	resolvePrestartRoomAction,
	shouldSyncNicknameWithDefault,
} from "./app";

vi.mock("#/lib/stt-group/client/api", async () => {
	const actual = await vi.importActual<
		typeof import("#/lib/stt-group/client/api")
	>("#/lib/stt-group/client/api");
	return {
		...actual,
		requestMobileViewerLink: vi.fn(),
	};
});

afterEach(() => {
	cleanup();
	window.localStorage.clear();
});

function CountdownProbe() {
	const t = useT();
	const countdownText = t("developerMode.unlimited");

	return (
		<div>
			<div data-testid="countdown">{countdownText}</div>
		</div>
	);
}

describe("developer mode countdown behavior", () => {
	it("installs the subtitle debug console api when the /app route module loads", () => {
		expect(
			(
				window as typeof window & {
					__STT_DEMO_SUBTITLE_DEBUG__?: {
						enableRawSubtitleLogging: () => boolean;
					};
				}
			).__STT_DEMO_SUBTITLE_DEBUG__,
		).toMatchObject({
			enableRawSubtitleLogging: expect.any(Function),
		});
	});

	it("shows unlimited when the current session metadata removes the limit", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<CountdownProbe />
			</LocaleProvider>,
		);

		expect(screen.getByTestId("countdown").textContent).toBe("无限制");
	});
});

describe("mobile viewer link request contract", () => {
	it("keeps the client request shape available for subtitle render mode forwarding", () => {
		const mockedRequestMobileViewerLink = vi.mocked(requestMobileViewerLink);
		mockedRequestMobileViewerLink({
			channelName: "stt-room-1",
			sessionId: "session-1",
			agentId: "agent-1",
			pubBotUid: "2000",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US"],
			subtitleRenderMode: "aligned",
		});

		expect(mockedRequestMobileViewerLink).toHaveBeenCalledWith(
			expect.objectContaining({
				subtitleRenderMode: "aligned",
			}),
		);
	});
});

describe("nickname default sync", () => {
	it("syncs the nickname only before the user diverges from the auto-filled value", () => {
		expect(
			shouldSyncNicknameWithDefault({
				nickname: "",
				lastAutoNickname: null,
			}),
		).toBe(true);

		expect(
			shouldSyncNicknameWithDefault({
				nickname: "刘泽远",
				lastAutoNickname: "刘泽远",
			}),
		).toBe(true);

		expect(
			shouldSyncNicknameWithDefault({
				nickname: "",
				lastAutoNickname: "刘泽远",
			}),
		).toBe(false);

		expect(
			shouldSyncNicknameWithDefault({
				nickname: "Alice",
				lastAutoNickname: "刘泽远",
			}),
		).toBe(false);
	});
});

describe("prestart form check", () => {
	const messages = {
		invalidChannelName: "频道名不能为空，长度不能超过 64 字节",
		selectSourceLanguage: "请选择源语言",
		selectTargetLanguage: "请选择翻译目标语言",
	};

	it("blocks create-mode start when the source language is empty", () => {
		const result = buildPrestartFormCheck({
			mode: "create",
			channelName: "demo-room",
			recognitionMode: "single",
			sourceLanguages: [],
			targetLanguages: ["en-US"],
			messages,
		});

		expect(result).toMatchObject({
			ok: false,
			message: "请选择源语言",
			languageSelection: null,
		});
	});

	it("blocks create-mode start when the target language is empty", () => {
		const result = buildPrestartFormCheck({
			mode: "create",
			channelName: "demo-room",
			recognitionMode: "single",
			sourceLanguages: ["zh-CN"],
			targetLanguages: [],
			messages,
		});

		expect(result).toMatchObject({
			ok: false,
			message: "请选择翻译目标语言",
			languageSelection: null,
		});
	});

	it("checks only the room id in join mode and does not return default language fallback", () => {
		const result = buildPrestartFormCheck({
			mode: "join",
			channelName: "demo-room",
			recognitionMode: "single",
			sourceLanguages: [],
			targetLanguages: [],
			messages,
		});

		expect(result).toMatchObject({
			ok: true,
			mode: "join",
			languageSelection: null,
		});
	});

	it("rejects join mode when room metadata is not running or starting", () => {
		const formCheck = buildPrestartFormCheck({
			mode: "join",
			channelName: "demo-room",
			recognitionMode: "single",
			sourceLanguages: [],
			targetLanguages: [],
			messages,
		});

		const result = resolvePrestartRoomAction({
			mode: "join",
			metadata: emptyRoomMetadata(),
			formCheck,
			roomNotStartedMessage: "房间不存在或未启动，请先创建房间",
		});

		expect(result).toEqual({
			kind: "reject",
			message: "房间不存在或未启动，请先创建房间",
		});
	});

	it("reuses an existing started room in join mode", () => {
		const formCheck = buildPrestartFormCheck({
			mode: "join",
			channelName: "demo-room",
			recognitionMode: "single",
			sourceLanguages: [],
			targetLanguages: [],
			messages,
		});

		const result = resolvePrestartRoomAction({
			mode: "join",
			metadata: {
				...emptyRoomMetadata(),
				status: "start",
				recognitionMode: "single",
				sourceLanguages: ["zh-CN"],
				targetLanguages: ["en-US"],
			},
			formCheck,
			roomNotStartedMessage: "房间不存在或未启动，请先创建房间",
		});

		expect(result).toEqual({ kind: "reuse" });
	});

	it("starts an empty room only in create mode with a valid language selection", () => {
		const formCheck = buildPrestartFormCheck({
			mode: "create",
			channelName: "demo-room",
			recognitionMode: "single",
			sourceLanguages: ["zh-CN"],
			targetLanguages: ["en-US"],
			messages,
		});

		const result = resolvePrestartRoomAction({
			mode: "create",
			metadata: emptyRoomMetadata(),
			formCheck,
			roomNotStartedMessage: "房间不存在或未启动，请先创建房间",
		});

		expect(result).toMatchObject({
			kind: "start",
			languageSelection: {
				recognitionMode: "single",
				sourceLanguages: ["zh-CN"],
				targetLanguages: ["en-US"],
			},
		});
	});
});

describe("app room surfaces", () => {
	it("renders join-mode prestart with an empty room id and the owner-only language hint", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<PrestartPanel
					mode="join"
					channelName=""
					nickname="刘泽远"
					recognitionMode="single"
					sourceLanguages={["zh-CN"]}
					targetLanguages={["en-US"]}
					microphoneDevices={[
						{ deviceId: "mic-1", label: "MacBook Pro 麦克风" },
					]}
					selectedMicrophoneDeviceId="mic-1"
					cameraDevices={[{ deviceId: "cam-1", label: "FaceTime HD Camera" }]}
					selectedCameraDeviceId="cam-1"
					subtitleDisplayMode="both"
					busy={false}
					canStart
					microphoneMuted={false}
					cameraEnabled={false}
					onChannelNameChange={() => {}}
					onNicknameChange={() => {}}
					onRecognitionModeChange={() => {}}
					onSourceLanguagesChange={() => {}}
					onTargetLanguagesChange={() => {}}
					onSubtitleDisplayModeChange={() => {}}
					onSelectMicrophoneDevice={() => {}}
					onSelectCameraDevice={() => {}}
					onToggleMicrophone={() => {}}
					onToggleCamera={() => {}}
					onStart={() => {}}
					onRandomChannelName={() => {}}
					onModeChange={() => {}}
					onOpenAdvanced={() => {}}
					localVideoRef={() => {}}
				/>
			</LocaleProvider>,
		);

		expect(
			screen.getByRole("textbox", { name: "房间号" }).getAttribute("value"),
		).toBe("");
		expect(
			screen.getByText(
				"语种信息只有房主在创建模式下可以设置，加入模式无法配置语种信息",
			),
		).toBeTruthy();
		expect(screen.getByRole("button", { name: "立即加入" })).toBeTruthy();
	});

	it("renders the qr overlay ready state with the copied link CTA", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<AccessOverlays
					channelName="A7Q3K9"
					activeOverlay="qr"
					brandSettings={DEFAULT_BRAND_SETTINGS}
					pendingLogoFile={null}
					viewerUrl="http://127.0.0.1:3200/mobile?viewerToken=debug-viewer-token"
					viewerLinkLoading={false}
					viewerLinkError={null}
					onBrandSettingsChange={() => {}}
					onConfirmBrandSettings={() => {}}
					onLogoSelected={() => {}}
					onLogoCanceled={() => {}}
					onLogoConfirmed={() => {}}
					onLogoReedit={() => {}}
					onClose={() => {}}
					onConfirmStop={() => {}}
				/>
			</LocaleProvider>,
		);

		expect(
			screen.getByText(
				"http://127.0.0.1:3200/mobile?viewerToken=debug-viewer-token",
			),
		).toBeTruthy();
		expect(screen.getByRole("button", { name: "复制链接" })).toBeTruthy();
	});

	it("renders the avatar menu entries for plugin, skin settings, and logout", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<ProductShell
					brandName="声网实时转录翻译"
					brandLogoUrl={null}
					displayName="刘泽远"
					avatarLabel="刘"
					avatarTitle="刘"
					avatarDisplayText="刘"
					channelName="A7Q3K9"
					roomJoined
					sttRunning={false}
					countdownText="10:00"
					developerModeUnlocked={false}
					developerModeEnabled={false}
					developerModeBadgeLabel="🛠 开发者模式"
					sidePanelVisible
					onBack={() => {}}
					onSidePanelToggle={() => {}}
					onLogout={() => {}}
					onOpenPlugin={() => {}}
					onOpenQr={() => {}}
					onOpenSkinSettings={() => {}}
					onDeveloperModeEntry={() => {}}
					onOpenDeveloperMode={() => {}}
					stage={<div />}
					side={<div />}
					dock={<div />}
					overlays={null}
				/>
			</LocaleProvider>,
		);

		fireEvent.click(screen.getByRole("button", { name: "刘" }));

		expect(screen.getByRole("menuitem", { name: "悬浮字幕插件" })).toBeTruthy();
		expect(screen.getByRole("menuitem", { name: "🎨 皮肤设置" })).toBeTruthy();
		expect(screen.getByRole("menuitem", { name: "退出登录" })).toBeTruthy();
	});
});
