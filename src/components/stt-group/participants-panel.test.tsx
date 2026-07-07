// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "#/lib/i18n";
import { MAX_GROUP_PARTICIPANTS } from "#/lib/stt-group";
import type { RemoteRtcUser } from "#/lib/stt-group/client/rtc-client";
import { ParticipantsPanel } from "./participants-panel";

const buildMembers = (count: number) =>
	Array.from({ length: count }, (_, index) => ({
		userId: `user-${index + 1}`,
		displayName: `User ${index + 1}`,
		rtcUid: `${1000 + index + 1}`,
		joinedAt: index + 1,
	}));

afterEach(() => {
	cleanup();
});

describe("ParticipantsPanel", () => {
	it("shows the online participant count in the header", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<ParticipantsPanel
					members={buildMembers(3)}
					remoteRtcUsers={[]}
					localUserId="user-1"
					controllerDisplayName="User 1"
					sessionLimitLabel="10:00"
					channelName="room-8"
					recognitionMode="single"
					sourceLanguages={["zh-CN"]}
					targetLanguages={["en-US"]}
					subtitleDisplayMode="both"
					microphoneMuted={false}
					cameraEnabled={false}
					localVideoRef={vi.fn()}
				/>
			</LocaleProvider>,
		);

		expect(screen.getByText("3 ONLINE")).toBeTruthy();
	});

	it("shows the full-room warning at capacity", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<ParticipantsPanel
					members={buildMembers(MAX_GROUP_PARTICIPANTS)}
					remoteRtcUsers={[]}
					localUserId="user-1"
					controllerDisplayName="User 1"
					sessionLimitLabel="10:00"
					channelName="room-8"
					recognitionMode="single"
					sourceLanguages={["zh-CN"]}
					targetLanguages={["en-US"]}
					subtitleDisplayMode="both"
					microphoneMuted={false}
					cameraEnabled={false}
					localVideoRef={vi.fn()}
				/>
			</LocaleProvider>,
		);

		expect(screen.getAllByText("频道人数已满")).toHaveLength(1);
	});

	it("shows controller and session limit details in the settings tab", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<ParticipantsPanel
					members={buildMembers(3)}
					remoteRtcUsers={[]}
					localUserId="user-1"
					controllerUserId="user-1"
					controllerDisplayName="Alice"
					sessionLimitLabel="无限制"
					channelName="room-8"
					recognitionMode="multi"
					sourceLanguages={["zh-CN", "en-US"]}
					targetLanguages={["ja-JP", "fr-FR"]}
					subtitleDisplayMode="target"
					microphoneMuted={false}
					cameraEnabled={false}
					localVideoRef={vi.fn()}
				/>
			</LocaleProvider>,
		);

		fireEvent.click(screen.getByRole("tab", { name: "设置" }));

		expect(screen.getByText("Alice")).toBeTruthy();
		expect(screen.getByText("无限制")).toBeTruthy();
		expect(screen.getByText("会话概览")).toBeTruthy();
		expect(screen.getByText("语言设置")).toBeTruthy();
		expect(screen.getByText("源语言").className).toContain("summary-key");
		expect(
			screen.getByText("Chinese (China), English (United States)").className,
		).toContain("summary-value--language-list");
	});

	it("collapses participants after the first six and expands the rest", () => {
		render(
			<LocaleProvider initialLocale="zh-CN">
				<ParticipantsPanel
					members={buildMembers(MAX_GROUP_PARTICIPANTS)}
					remoteRtcUsers={[]}
					localUserId="user-1"
					controllerDisplayName="User 1"
					sessionLimitLabel="10:00"
					channelName="room-8"
					recognitionMode="single"
					sourceLanguages={["zh-CN"]}
					targetLanguages={["en-US"]}
					subtitleDisplayMode="both"
					microphoneMuted={false}
					cameraEnabled={false}
					localVideoRef={vi.fn()}
				/>
			</LocaleProvider>,
		);

		expect(screen.getByText("User 6")).toBeTruthy();
		expect(screen.queryByText("User 7")).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "参会者 +2展开" }));

		expect(screen.getByText("User 7")).toBeTruthy();
		expect(screen.getByText("User 8")).toBeTruthy();
	});

	it("orders self first, then remote video participants before audio-only participants", () => {
		const remoteVideoTrack = {
			play: vi.fn(),
			stop: vi.fn(),
		};
		const remoteAudioTrack = {};
		render(
			<LocaleProvider initialLocale="zh-CN">
				<ParticipantsPanel
					members={buildMembers(4)}
					remoteRtcUsers={
						[
							{ uid: "1002", audioTrack: remoteAudioTrack },
							{
								uid: "1003",
								audioTrack: remoteAudioTrack,
								videoTrack: remoteVideoTrack,
							},
						] as RemoteRtcUser[]
					}
					localUserId="user-1"
					controllerUserId="user-3"
					controllerDisplayName="User 3"
					sessionLimitLabel="10:00"
					channelName="room-8"
					recognitionMode="single"
					sourceLanguages={["zh-CN"]}
					targetLanguages={["en-US"]}
					subtitleDisplayMode="both"
					microphoneMuted={false}
					cameraEnabled={false}
					localVideoRef={vi.fn()}
				/>
			</LocaleProvider>,
		);

		const names = screen
			.getAllByText(/^User /)
			.map((element) => element.textContent);

		expect(names.slice(0, 3)).toEqual(["User 1", "User 3", "User 2"]);
		expect(
			screen
				.getByText("User 3")
				.closest(".p-card")
				?.classList.contains("video"),
		).toBe(true);
		expect(
			screen
				.getByText("User 2")
				.closest(".p-card")
				?.classList.contains("audio"),
		).toBe(true);
	});
});
