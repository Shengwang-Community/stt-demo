import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { MobileViewer } from "#/components/stt-group/mobile-viewer";
import { ERROR_CODES, useT } from "#/lib/i18n";
import {
	type MobileViewerPageState,
	type MobileViewerSessionResponse,
	reduceSubtitleMessage,
	type SttRoomMember,
	type SubtitleLine,
} from "#/lib/stt-group";
import { ApiError } from "#/lib/stt-group/client/api";
import type { GroupRtcSession } from "#/lib/stt-group/client/rtc-client";
import type { MobileViewerRtmSession } from "#/lib/stt-group/client/rtm-client";
import { installSubtitleDebugConsoleApi } from "#/lib/stt-group/client/subtitle-debug";
import { connectMobileViewer } from "./-mobile-viewer-connection";

installSubtitleDebugConsoleApi();

export const Route = createFileRoute("/mobile")({
	validateSearch: (search: Record<string, unknown>) => ({
		viewerToken:
			typeof search.viewerToken === "string" ? search.viewerToken : "",
	}),
	component: MobileRoute,
});

function MobileRoute() {
	const t = useT();
	const { viewerToken } = Route.useSearch();
	const [state, setState] = React.useState<MobileViewerPageState>(
		viewerToken ? "connecting" : "expired",
	);
	const [displayMode, setDisplayMode] = React.useState<
		"both" | "source" | "target"
	>("both");
	const [activeTargetLanguage, setActiveTargetLanguage] =
		React.useState("en-US");
	const [session, setSession] =
		React.useState<MobileViewerSessionResponse | null>(null);
	const [lines, setLines] = React.useState<SubtitleLine[]>([]);
	const [members, setMembers] = React.useState<SttRoomMember[]>([]);
	const [errorMessage, setErrorMessage] = React.useState<string>();
	const rtcSessionRef = React.useRef<GroupRtcSession | null>(null);
	const rtmSessionRef = React.useRef<MobileViewerRtmSession | null>(null);

	React.useEffect(() => {
		document.body.dataset.page = "mobile";
		return () => {
			delete document.body.dataset.page;
		};
	}, []);

	React.useEffect(() => {
		if (!viewerToken) {
			setState("expired");
			return;
		}

		let cancelled = false;

		const connect = async () => {
			try {
				setState("connecting");
				setErrorMessage(undefined);
				const connection = await connectMobileViewer({
					viewerToken,
					onSubtitle: (message, sessionResponse) => {
						setLines((current) =>
							reduceSubtitleMessage(
								current,
								message,
								Date.now(),
								sessionResponse.subtitleRenderMode,
							),
						);
					},
					onMembers: setMembers,
				});
				if (cancelled) {
					await connection.rtcSession.leave().catch(() => undefined);
					await connection.rtmSession?.leave().catch(() => undefined);
					return;
				}

				setSession(connection.sessionResponse);
				rtcSessionRef.current = connection.rtcSession;
				rtmSessionRef.current = connection.rtmSession;
				setState("live");
			} catch (error) {
				const message =
					error instanceof ApiError
						? error.errorCode === ERROR_CODES.VIEWER_LINK_INVALID
							? t("errors.viewerLinkInvalid")
							: error.errorCode === ERROR_CODES.ROOM_ENDED
								? t("errors.roomEnded")
								: error.message
						: error instanceof Error
							? error.message
							: t("errors.mobileViewerConnectFailed");
				if (cancelled) {
					return;
				}
				if (
					error instanceof ApiError &&
					error.errorCode === ERROR_CODES.VIEWER_LINK_INVALID
				) {
					setState("expired");
					return;
				}
				if (
					error instanceof ApiError &&
					error.errorCode === ERROR_CODES.ROOM_ENDED
				) {
					setState("ended");
					return;
				}
				setErrorMessage(message);
				setState("error");
			}
		};

		void connect();

		return () => {
			cancelled = true;
			void rtcSessionRef.current?.leave();
			void rtmSessionRef.current?.leave();
			rtcSessionRef.current = null;
			rtmSessionRef.current = null;
		};
	}, [viewerToken, t]);

	React.useEffect(() => {
		const targetLanguages = session?.targetLanguages ?? [];
		if (targetLanguages.length === 0) {
			return;
		}
		if (targetLanguages.includes(activeTargetLanguage)) {
			return;
		}
		setActiveTargetLanguage(targetLanguages[0] ?? activeTargetLanguage);
	}, [activeTargetLanguage, session?.targetLanguages]);

	return (
		<MobileViewer
			state={state}
			errorMessage={errorMessage}
			channelName={session?.channelName ?? ""}
			brandName={session?.brandName}
			brandLogoUrl={session?.brandLogoUrl}
			sourceLanguages={session?.sourceLanguages ?? []}
			targetLanguages={session?.targetLanguages ?? []}
			subtitleRenderMode={session?.subtitleRenderMode ?? "append"}
			lines={lines}
			members={members}
			displayMode={displayMode}
			onDisplayModeChange={setDisplayMode}
			activeTargetLanguage={activeTargetLanguage}
			onActiveTargetLanguageChange={setActiveTargetLanguage}
		/>
	);
}
