// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "#/lib/i18n";
import { PrestartPanel } from "./prestart-panel";
import { ProductShell } from "./product-shell";

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("ProductShell developer mode entry", () => {
	it("shows the translation button in the top-right shell controls", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<ProductShell
					displayName="demo"
					avatarLabel="DE"
					channelName="room-1"
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
					onDeveloperModeEntry={() => {}}
					onOpenDeveloperMode={() => {}}
					stage={<div />}
					side={<div />}
					dock={<div />}
					overlays={null}
				/>
			</LocaleProvider>,
		);

		expect(screen.getByRole("button", { name: "语言" })).toBeTruthy();
		expect(screen.getAllByRole("button", { name: "语言" })).toHaveLength(1);
		expect(screen.queryByRole("button", { name: "退出登录" })).toBeNull();
	});

	it("shows plugin, skin settings, and logout in the avatar menu", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<ProductShell
					brandName="demo"
					brandLogoUrl={null}
					displayName="刘泽远"
					avatarLabel="刘"
					avatarTitle="刘"
					avatarDisplayText="刘"
					channelName="room-1"
					roomJoined={false}
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

	it("shows joined room session details from the info dropdown", () => {
		const writeText = vi.fn();
		vi.stubGlobal("navigator", {
			...navigator,
			clipboard: { writeText },
		});

		render(
			<LocaleProvider initialLocale="zh-CN">
				<ProductShell
					brandName="demo"
					brandLogoUrl={null}
					displayName="demo"
					avatarLabel="DE"
					avatarTitle="DE"
					avatarDisplayText="DE"
					channelName="room-1"
					uid="100321"
					agentId="agent-abc1234567890"
					roomJoined
					sttRunning
					countdownText="09:42"
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

		fireEvent.click(screen.getByRole("button", { name: "会话信息" }));

		expect(screen.getByRole("menu", { name: "会话信息" })).toBeTruthy();
		expect(screen.getAllByText("room-1")).toHaveLength(2);
		expect(screen.getByText("100321")).toBeTruthy();
		expect(screen.getByText("agent-abc1234567890")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "复制 Room" }));
		fireEvent.click(screen.getByRole("button", { name: "复制 UID" }));
		fireEvent.click(screen.getByRole("button", { name: "复制 Agent ID" }));

		expect(writeText).toHaveBeenNthCalledWith(1, "room-1");
		expect(writeText).toHaveBeenNthCalledWith(2, "100321");
		expect(writeText).toHaveBeenNthCalledWith(3, "agent-abc1234567890");
	});

	it("shows the developer mode badge when enabled", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<ProductShell
					displayName="demo"
					avatarLabel="DE"
					channelName="room-1"
					roomJoined={false}
					sttRunning={false}
					countdownText="10:00"
					developerModeUnlocked={false}
					developerModeEnabled
					developerModeBadgeLabel="🛠 开发者模式"
					sidePanelVisible
					onBack={() => {}}
					onSidePanelToggle={() => {}}
					onLogout={() => {}}
					onOpenPlugin={() => {}}
					onOpenQr={() => {}}
					onDeveloperModeEntry={() => {}}
					onOpenDeveloperMode={() => {}}
					stage={<div />}
					side={<div />}
					dock={<div />}
					overlays={null}
				/>
			</LocaleProvider>,
		);

		expect(screen.getByText("🛠 开发者模式")).toBeTruthy();
	});

	it("keeps the translation button visible before joining the room", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<ProductShell
					displayName="demo"
					avatarLabel="DE"
					channelName="room-1"
					roomJoined={false}
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
					onDeveloperModeEntry={() => {}}
					onOpenDeveloperMode={() => {}}
					stage={<div />}
					side={<div />}
					dock={<div />}
					overlays={null}
				/>
			</LocaleProvider>,
		);

		expect(screen.getByRole("button", { name: "语言" })).toBeTruthy();
	});

	it("renders the default brand logo without cropping class overrides", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<ProductShell
					brandName="demo"
					brandLogoUrl={null}
					displayName="demo"
					avatarLabel="DE"
					avatarTitle="DE"
					avatarDisplayText="DE"
					channelName="room-1"
					roomJoined={false}
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

		expect(document.querySelector(".brand-logo--default")).toBeTruthy();
	});

	it("fires the hidden entry callback after five rapid logo clicks", () => {
		vi.useFakeTimers();
		const onDeveloperModeEntry = vi.fn();

		render(
			<LocaleProvider initialLocale="zh-CN">
				<ProductShell
					displayName="demo"
					avatarLabel="DE"
					channelName="room-1"
					roomJoined={false}
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
					onDeveloperModeEntry={onDeveloperModeEntry}
					onOpenDeveloperMode={() => {}}
					stage={<div />}
					side={<div />}
					dock={<div />}
					overlays={null}
				/>
			</LocaleProvider>,
		);

		const [trigger] = screen.getAllByRole("button", {
			name: "开发者模式隐藏入口",
		});
		for (let index = 0; index < 5; index += 1) {
			fireEvent.click(trigger);
			vi.advanceTimersByTime(200);
		}

		expect(onDeveloperModeEntry).toHaveBeenCalledTimes(1);
	});

	it("fires the hidden entry callback after five rapid brand-name clicks", () => {
		vi.useFakeTimers();
		const onDeveloperModeEntry = vi.fn();

		render(
			<LocaleProvider initialLocale="zh-CN">
				<ProductShell
					brandName="demo"
					brandLogoUrl={null}
					displayName="demo"
					avatarLabel="DE"
					avatarTitle="DE"
					avatarDisplayText="DE"
					channelName="room-1"
					roomJoined={false}
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
					onDeveloperModeEntry={onDeveloperModeEntry}
					onOpenDeveloperMode={() => {}}
					stage={<div />}
					side={<div />}
					dock={<div />}
					overlays={null}
				/>
			</LocaleProvider>,
		);

		const triggers = screen.getAllByRole("button", {
			name: "开发者模式隐藏入口",
		});
		const brandNameTrigger = triggers[1];
		for (let index = 0; index < 5; index += 1) {
			fireEvent.click(brandNameTrigger);
			vi.advanceTimersByTime(200);
		}

		expect(onDeveloperModeEntry).toHaveBeenCalledTimes(1);
	});

	it("can render the full prestart design shell content", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<ProductShell
					displayName="刘泽远"
					avatarLabel="刘"
					avatarTitle="刘"
					avatarDisplayText="刘"
					channelName="A7Q3K9"
					roomJoined={false}
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
					onDeveloperModeEntry={() => {}}
					onOpenDeveloperMode={() => {}}
					stage={<div />}
					side={
						<PrestartPanel
							mode="create"
							channelName="A7Q3K9"
							nickname="刘泽远"
							recognitionMode="auto"
							sourceLanguages={["zh-CN"]}
							targetLanguages={["en-US"]}
							microphoneDevices={[
								{ deviceId: "macbook", label: "MacBook Pro 麦克风" },
								{ deviceId: "shure", label: "Shure MV7" },
								{ deviceId: "logi", label: "Logi Yeti GX" },
							]}
							selectedMicrophoneDeviceId="macbook"
							cameraDevices={[
								{ deviceId: "facetime", label: "FaceTime HD Camera" },
								{ deviceId: "sony", label: "Sony ZV-E10" },
								{ deviceId: "obs", label: "OBS Virtual Camera" },
							]}
							selectedCameraDeviceId="facetime"
							subtitleDisplayMode="both"
							busy={false}
							canStart
							microphoneMuted
							cameraEnabled
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
					}
					dock={<div />}
					overlays={null}
				/>
			</LocaleProvider>,
		);

		expect(screen.getByText("房间信息")).toBeTruthy();
		expect(screen.getByText("语言设置")).toBeTruthy();
		expect(screen.getByText("设备设置")).toBeTruthy();
	});
});
