import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AccessOverlays } from "#/components/stt-group/access-overlays";
import { ControlDock } from "#/components/stt-group/control-dock";
import { DeveloperModePanel } from "#/components/stt-group/developer-mode-panel";
import { ParticipantsPanel } from "#/components/stt-group/participants-panel";
import {
	PrestartPanel,
	type PrestartRecognitionMode,
} from "#/components/stt-group/prestart-panel";
import { ProductShell } from "#/components/stt-group/product-shell";
import {
	type SubtitleDisplayMode,
	SubtitleStage,
} from "#/components/stt-group/subtitle-stage";
import {
	DeveloperModeProvider,
	useDeveloperMode,
} from "#/lib/developer-mode/store";
import { useLocale, useT } from "#/lib/i18n";
import { fetchSsoUserInfo, redirectToSsoLogout } from "#/lib/sso";
import type { SubtitleLine } from "#/lib/stt-group";
import {
	type BrandSettings,
	buildStartedRoomMetadata,
	createBrandSettings,
	createDefaultChannelName,
	createHumanUid,
	DEFAULT_BRAND_SETTINGS,
	DEFAULT_EXPERIENCE_SECONDS,
	DEFAULT_TARGET_LANGUAGES,
	type DeveloperModeRequestOverrides,
	emptyRoomMetadata,
	isSupportedLogoFile,
	isValidChannelName,
	type LanguageCode,
	type RecognitionMode,
	readBrandSettings,
	reduceSubtitleMessage,
	resolveSourceLanguagesForRecognitionModeChange,
	type SttRoomCloseReason,
	type SttRoomMember,
	type SttRoomMetadata,
	type ValidRoomLanguageSelection,
	validateLanguageSelection,
	writeBrandSettings,
} from "#/lib/stt-group";
import {
	downloadSessionVttZip,
	listSessionVtt,
	requestMobileViewerLink,
	requestRtcToken,
	requestRtmToken,
	requestStartSttSession,
	requestStopSttSession,
} from "#/lib/stt-group/client/api";
import type {
	GroupRtcSession,
	LocalCameraPreviewSession,
	MediaDeviceOption,
	RemoteRtcUser,
} from "#/lib/stt-group/client/rtc-client";
import type { GroupRtmSession } from "#/lib/stt-group/client/rtm-client";
import {
	installSubtitleDebugConsoleApi,
	syncRawSubtitleLogging,
} from "#/lib/stt-group/client/subtitle-debug";

installSubtitleDebugConsoleApi();

export const Route = createFileRoute("/app")({ component: AppRoute });

type UserInfo = Record<string, unknown>;

type PrestartFormCheckMessages = {
	invalidChannelName: string;
	selectSourceLanguage: string;
	selectTargetLanguage: string;
};

type PrestartFormCheckInput = {
	mode: "create" | "join";
	channelName: string;
	recognitionMode: RecognitionMode;
	sourceLanguages: LanguageCode[];
	targetLanguages: LanguageCode[];
	messages: PrestartFormCheckMessages;
};

type PrestartFormCheck =
	| {
			ok: true;
			mode: "create";
			message: null;
			languageSelection: ValidRoomLanguageSelection;
	  }
	| {
			ok: true;
			mode: "join";
			message: null;
			languageSelection: null;
	  }
	| {
			ok: false;
			message: string;
			languageSelection: null;
	  };

export const buildPrestartFormCheck = ({
	mode,
	channelName,
	recognitionMode,
	sourceLanguages,
	targetLanguages,
	messages,
}: PrestartFormCheckInput): PrestartFormCheck => {
	if (!isValidChannelName(channelName.trim())) {
		return {
			ok: false,
			message: messages.invalidChannelName,
			languageSelection: null,
		};
	}

	if (mode === "join") {
		return {
			ok: true,
			mode: "join",
			message: null,
			languageSelection: null,
		};
	}

	if (recognitionMode !== "auto" && sourceLanguages.length < 1) {
		return {
			ok: false,
			message: messages.selectSourceLanguage,
			languageSelection: null,
		};
	}

	if (targetLanguages.length < 1) {
		return {
			ok: false,
			message: messages.selectTargetLanguage,
			languageSelection: null,
		};
	}

	const languageValidation = validateLanguageSelection({
		recognitionMode,
		sourceLanguages,
		targetLanguages,
	});
	if (!languageValidation.ok) {
		return {
			ok: false,
			message: languageValidation.message,
			languageSelection: null,
		};
	}

	return {
		ok: true,
		mode: "create",
		message: null,
		languageSelection: languageValidation.selection,
	};
};

type PrestartRoomAction =
	| { kind: "start"; languageSelection: ValidRoomLanguageSelection }
	| { kind: "reuse" }
	| { kind: "reject"; message: string };

export const resolvePrestartRoomAction = ({
	mode,
	metadata,
	formCheck,
	roomNotStartedMessage,
}: {
	mode: "create" | "join";
	metadata: SttRoomMetadata;
	formCheck: PrestartFormCheck;
	roomNotStartedMessage: string;
}): PrestartRoomAction => {
	if (!formCheck.ok) {
		return { kind: "reject", message: formCheck.message };
	}

	if (mode === "join") {
		if (metadata.status === "start" || metadata.status === "starting") {
			return { kind: "reuse" };
		}
		return { kind: "reject", message: roomNotStartedMessage };
	}

	if (
		(metadata.status === "end" || metadata.status === "error") &&
		formCheck.mode === "create"
	) {
		return {
			kind: "start",
			languageSelection: formCheck.languageSelection,
		};
	}

	return { kind: "reuse" };
};

const getDisplayName = (userInfo: UserInfo | null) => {
	if (!userInfo) {
		return "";
	}

	for (const key of ["displayName", "nickname", "email", "accountUid"]) {
		const value = userInfo[key];
		if (typeof value === "string" && value.length > 0) {
			return value;
		}
	}

	return "";
};

const getDefaultNickname = (
	userInfo: UserInfo | null,
	defaultDemoNickname: string,
) => {
	const displayName = getDisplayName(userInfo).trim();
	if (/^用户[0-9a-z]+$/i.test(displayName)) {
		return defaultDemoNickname;
	}
	return displayName;
};

const normalizeDeviceLabel = ({
	label,
	fallback,
}: {
	label: string;
	fallback: string;
}) => {
	const trimmed = label.trim();
	if (!trimmed || /^(microphone|camera)\s+\d+$/i.test(trimmed)) {
		return fallback;
	}
	return trimmed;
};

const getAvatarLabel = (displayName: string) => {
	const trimmed = displayName.trim();
	if (!trimmed) {
		return "ME";
	}
	if (/^[A-Za-z]/.test(trimmed)) {
		return trimmed.slice(0, 2).toUpperCase();
	}
	return trimmed.slice(0, 1);
};

const getAvatarTitle = (displayName: string) => {
	const trimmed = displayName.trim();
	if (!trimmed) {
		return "ME";
	}
	if (/^\d/.test(trimmed)) {
		return trimmed.slice(0, 1);
	}
	return getAvatarLabel(trimmed);
};

const getAvatarDisplayText = (displayName: string) => {
	const trimmed = displayName.trim();
	if (!trimmed) {
		return "ME";
	}
	return trimmed.slice(0, 1);
};

export const shouldSyncNicknameWithDefault = ({
	nickname,
	lastAutoNickname,
}: {
	nickname: string;
	lastAutoNickname: string | null;
}) =>
	nickname.length === 0 && lastAutoNickname === null
		? true
		: lastAutoNickname !== null && nickname === lastAutoNickname;

const PRESTART_NICKNAME_STORAGE_KEY = "stt-demo.prestart-nickname";

const formatTime = (value: number, locale: string) =>
	new Intl.DateTimeFormat(locale, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	}).format(value);

const formatCountdown = (startedAt?: number) => {
	if (!startedAt) {
		const minutes = Math.floor(DEFAULT_EXPERIENCE_SECONDS / 60);
		const seconds = DEFAULT_EXPERIENCE_SECONDS % 60;
		return `${minutes.toString().padStart(2, "0")}:${seconds
			.toString()
			.padStart(2, "0")}`;
	}

	const elapsedSeconds = Math.max(
		0,
		Math.floor((Date.now() - startedAt) / 1000),
	);
	const remainingSeconds = Math.max(
		0,
		DEFAULT_EXPERIENCE_SECONDS - elapsedSeconds,
	);
	const minutes = Math.floor(remainingSeconds / 60);
	const seconds = remainingSeconds % 60;
	return `${minutes.toString().padStart(2, "0")}:${seconds
		.toString()
		.padStart(2, "0")}`;
};

const downloadBlobFile = ({
	blob,
	filename,
}: {
	blob: Blob;
	filename: string;
}) => {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
};

const buildDeveloperRequestOverrides = (
	enabled: boolean,
	requestOverrides: {
		enabled: boolean;
		customAppId: string;
		requestBaseUrl: string;
		xServiceNamespace: string;
	},
): DeveloperModeRequestOverrides | undefined => {
	if (!enabled || !requestOverrides.enabled) {
		return undefined;
	}

	const overrides: DeveloperModeRequestOverrides = {
		applied: true,
	};

	if (requestOverrides.customAppId.trim()) {
		overrides.customAppId = requestOverrides.customAppId.trim();
	}
	if (requestOverrides.requestBaseUrl.trim()) {
		overrides.requestBaseUrl = requestOverrides.requestBaseUrl.trim();
	}
	if (requestOverrides.xServiceNamespace.trim()) {
		overrides.xServiceNamespace = requestOverrides.xServiceNamespace.trim();
	}

	return Object.keys(overrides).length === 1 ? undefined : overrides;
};

const buildSelectedSttVendorForStart = ({
	enabled,
	sttVendor,
}: {
	enabled: boolean;
	sttVendor: ReturnType<typeof useDeveloperMode>["state"]["sttVendor"];
}) => {
	if (!enabled || sttVendor === "default") {
		return undefined;
	}

	return sttVendor;
};

function AppRoute() {
	return (
		<DeveloperModeProvider>
			<AppRouteScreen />
		</DeveloperModeProvider>
	);
}

function AppRouteScreen() {
	const t = useT();
	const { locale } = useLocale();
	const { state: developerMode, unlock } = useDeveloperMode();
	const demoNickname = t("branding.demoNickname");
	const [userInfo, setUserInfo] = React.useState<UserInfo | null>(null);
	const [authLoading, setAuthLoading] = React.useState(true);
	const [roomJoined, setRoomJoined] = React.useState(false);
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [channelName, setChannelName] = React.useState("");
	const [prestartMode, setPrestartMode] = React.useState<"create" | "join">(
		"create",
	);
	const [nickname, setNickname] = React.useState("");
	const [recognitionMode, setRecognitionMode] =
		React.useState<RecognitionMode>("single");
	const [prestartRecognitionMode, setPrestartRecognitionMode] =
		React.useState<PrestartRecognitionMode>("single");
	const [sourceLanguages, setSourceLanguages] = React.useState<LanguageCode[]>(
		[],
	);
	const [targetLanguages, setTargetLanguages] = React.useState<LanguageCode[]>(
		[],
	);
	const [activeTargetLanguage, setActiveTargetLanguage] =
		React.useState<LanguageCode>(DEFAULT_TARGET_LANGUAGES[0] ?? "en-US");
	const [metadata, setMetadata] =
		React.useState<SttRoomMetadata>(emptyRoomMetadata);
	const [members, setMembers] = React.useState<SttRoomMember[]>([]);
	const [remoteRtcUsers, setRemoteRtcUsers] = React.useState<RemoteRtcUser[]>(
		[],
	);
	const [subtitles, setSubtitles] = React.useState<SubtitleLine[]>([]);
	const [microphoneMuted, setMicrophoneMuted] = React.useState(false);
	const [cameraEnabled, setCameraEnabled] = React.useState(false);
	const [prestartMicrophoneReady, setPrestartMicrophoneReady] =
		React.useState(false);
	const [microphoneDevices, setMicrophoneDevices] = React.useState<
		MediaDeviceOption[]
	>([]);
	const [cameraDevices, setCameraDevices] = React.useState<MediaDeviceOption[]>(
		[],
	);
	const [selectedMicrophoneDeviceId, setSelectedMicrophoneDeviceId] =
		React.useState("");
	const [selectedCameraDeviceId, setSelectedCameraDeviceId] =
		React.useState("");
	const [mediaBusy, setMediaBusy] = React.useState(false);
	const [displayMode, setDisplayMode] =
		React.useState<SubtitleDisplayMode>("both");
	const [sidePanelVisible, setSidePanelVisible] = React.useState(true);
	const [activeOverlay, setActiveOverlay] = React.useState<
		| "plugin"
		| "qr"
		| "advanced"
		| "skin-settings"
		| "confirm-apply"
		| "confirm-stop"
		| null
	>(null);
	const [viewerUrl, setViewerUrl] = React.useState<string | null>(null);
	const [viewerLinkLoading, setViewerLinkLoading] = React.useState(false);
	const [viewerLinkError, setViewerLinkError] = React.useState<string | null>(
		null,
	);
	const [brandSettings, setBrandSettings] = React.useState<BrandSettings>(
		DEFAULT_BRAND_SETTINGS,
	);
	const [draftBrandSettings, setDraftBrandSettings] =
		React.useState<BrandSettings>(DEFAULT_BRAND_SETTINGS);
	const [pendingLogoFile, setPendingLogoFile] = React.useState<File | null>(
		null,
	);
	const [brandingToast, setBrandingToast] = React.useState<string | null>(null);
	const [developerModeOpen, setDeveloperModeOpen] = React.useState(false);
	const [, setClockTick] = React.useState(Date.now());
	const uidRef = React.useRef(createHumanUid());
	const lastAutoNicknameRef = React.useRef<string | null>(null);
	const rtcSessionRef = React.useRef<GroupRtcSession | null>(null);
	const rtmSessionRef = React.useRef<GroupRtmSession | null>(null);
	const localCameraPreviewRef = React.useRef<LocalCameraPreviewSession | null>(
		null,
	);
	const localVideoElementRef = React.useRef<HTMLDivElement | null>(null);
	const playLocalVideoIntoMountedElement = React.useCallback(() => {
		if (!cameraEnabled || !localVideoElementRef.current) {
			return;
		}
		if (rtcSessionRef.current) {
			rtcSessionRef.current.playLocalVideo(localVideoElementRef.current);
			return;
		}
		localCameraPreviewRef.current?.play(localVideoElementRef.current);
	}, [cameraEnabled]);
	const localVideoRef = React.useCallback(
		(element: HTMLDivElement | null) => {
			localVideoElementRef.current = element;
			playLocalVideoIntoMountedElement();
		},
		[playLocalVideoIntoMountedElement],
	);

	React.useEffect(() => {
		document.body.dataset.page = "product";
		return () => {
			delete document.body.dataset.page;
		};
	}, []);

	React.useEffect(() => {
		syncRawSubtitleLogging(developerMode.enabled);
	}, [developerMode.enabled]);

	const syncAvailableDevices = React.useCallback(async () => {
		const { listAvailableMediaDevices } = await import(
			"#/lib/stt-group/client/rtc-client"
		);
		const { microphones, cameras } = await listAvailableMediaDevices();
		setMicrophoneDevices(
			microphones.map((device) => ({
				...device,
				label: normalizeDeviceLabel({
					label: device.label,
					fallback: t("prestart.defaultMicrophoneName"),
				}),
			})),
		);
		setCameraDevices(
			cameras.map((device) => ({
				...device,
				label: normalizeDeviceLabel({
					label: device.label,
					fallback: t("prestart.defaultCameraName"),
				}),
			})),
		);
		setSelectedMicrophoneDeviceId(
			(current) => current || microphones[0]?.deviceId || "",
		);
		setSelectedCameraDeviceId(
			(current) => current || cameras[0]?.deviceId || "",
		);
	}, [t]);

	React.useEffect(() => {
		let isMounted = true;

		const loadUser = async () => {
			try {
				const response = await fetchSsoUserInfo();
				if (isMounted) {
					setUserInfo((response?.data as UserInfo | undefined) ?? null);
				}
			} catch {
				if (isMounted) {
					setUserInfo(null);
				}
			} finally {
				if (isMounted) {
					setAuthLoading(false);
				}
			}
		};

		void loadUser();

		return () => {
			isMounted = false;
		};
	}, []);

	React.useEffect(() => {
		if (authLoading || userInfo) {
			return;
		}

		window.location.replace("/");
	}, [authLoading, userInfo]);

	React.useEffect(() => {
		setBrandSettings(readBrandSettings());
	}, []);

	React.useEffect(() => {
		setDraftBrandSettings(readBrandSettings());
	}, []);

	React.useEffect(() => {
		if (roomJoined) {
			return;
		}

		uidRef.current = createHumanUid();
		if (prestartMode === "join") {
			setChannelName("");
			return;
		}

		setChannelName((current) => current || createDefaultChannelName());
	}, [prestartMode, roomJoined]);

	React.useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const cachedNickname = window.localStorage.getItem(
			PRESTART_NICKNAME_STORAGE_KEY,
		);
		if (cachedNickname !== null) {
			setNickname(cachedNickname);
			lastAutoNicknameRef.current = null;
		}
	}, []);

	React.useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		window.localStorage.setItem(PRESTART_NICKNAME_STORAGE_KEY, nickname);
	}, [nickname]);

	React.useEffect(() => {
		writeBrandSettings(createBrandSettings(brandSettings));
	}, [brandSettings]);

	React.useEffect(() => {
		if (!brandingToast) {
			return;
		}
		const timeoutId = window.setTimeout(() => setBrandingToast(null), 2200);
		return () => window.clearTimeout(timeoutId);
	}, [brandingToast]);

	React.useEffect(() => {
		rtcSessionRef.current?.setPubBotUid(metadata.pubBotUid);
	}, [metadata.pubBotUid]);

	React.useEffect(() => {
		if (
			metadata.recognitionMode &&
			metadata.sourceLanguages?.length &&
			metadata.targetLanguages?.length
		) {
			setRecognitionMode(metadata.recognitionMode);
			setPrestartRecognitionMode(metadata.recognitionMode);
			setSourceLanguages(metadata.sourceLanguages);
			setTargetLanguages(metadata.targetLanguages);
		}
	}, [
		metadata.recognitionMode,
		metadata.sourceLanguages,
		metadata.targetLanguages,
	]);

	React.useEffect(() => {
		if (targetLanguages.includes(activeTargetLanguage)) {
			return;
		}
		setActiveTargetLanguage(targetLanguages[0] ?? DEFAULT_TARGET_LANGUAGES[0]);
	}, [activeTargetLanguage, targetLanguages]);

	React.useEffect(() => {
		if (prestartMode === "join") {
			setChannelName("");
			return;
		}

		setChannelName((current) => current || createDefaultChannelName());
	}, [prestartMode]);

	React.useEffect(() => {
		playLocalVideoIntoMountedElement();
	}, [playLocalVideoIntoMountedElement]);

	React.useEffect(() => {
		void syncAvailableDevices().catch(() => undefined);
	}, [syncAvailableDevices]);

	React.useEffect(() => {
		const intervalId = window.setInterval(() => setClockTick(Date.now()), 1000);
		return () => window.clearInterval(intervalId);
	}, []);

	React.useEffect(
		() => () => {
			localCameraPreviewRef.current?.close();
			void rtcSessionRef.current?.leave();
			void rtmSessionRef.current?.leave();
		},
		[],
	);

	React.useEffect(() => {
		if (activeOverlay !== "qr") {
			setViewerUrl(null);
			setViewerLinkLoading(false);
			setViewerLinkError(null);
			return;
		}

		if (
			!roomJoined ||
			metadata.status !== "start" ||
			!metadata.sessionId ||
			!metadata.agentId ||
			!metadata.pubBotUid
		) {
			setViewerUrl(null);
			setViewerLinkLoading(false);
			setViewerLinkError(t("room.qrUnavailable"));
			return;
		}

		let cancelled = false;

		const loadViewerUrl = async () => {
			try {
				setViewerLinkLoading(true);
				setViewerLinkError(null);
				const response = await requestMobileViewerLink({
					channelName,
					sessionId: metadata.sessionId,
					agentId: metadata.agentId,
					pubBotUid: metadata.pubBotUid,
					sourceLanguages,
					targetLanguages,
					subtitleRenderMode: developerMode.subtitleRenderMode,
					brandName: brandSettings.productName,
					brandLogoUrl: brandSettings.logoAsset?.dataUrl ?? null,
				});
				if (!cancelled) {
					setViewerUrl(response.viewerUrl);
				}
			} catch (caughtError) {
				if (!cancelled) {
					setViewerUrl(null);
					setViewerLinkError(
						caughtError instanceof Error
							? caughtError.message
							: t("room.qrGenerateFailed"),
					);
				}
			} finally {
				if (!cancelled) {
					setViewerLinkLoading(false);
				}
			}
		};

		void loadViewerUrl();

		return () => {
			cancelled = true;
		};
	}, [
		activeOverlay,
		channelName,
		developerMode.subtitleRenderMode,
		roomJoined,
		metadata.status,
		metadata.sessionId,
		metadata.agentId,
		metadata.pubBotUid,
		sourceLanguages,
		targetLanguages,
		brandSettings.productName,
		brandSettings.logoAsset?.dataUrl,
		t,
	]);

	React.useEffect(() => {
		if (
			!roomJoined ||
			metadata.status !== "end" ||
			metadata.closeReason !== "expired"
		) {
			return;
		}

		let cancelled = false;

		const leaveEndedSession = async () => {
			await rtcSessionRef.current?.leave().catch(() => undefined);
			await rtmSessionRef.current?.leave().catch(() => undefined);
			if (cancelled) {
				return;
			}
			rtcSessionRef.current = null;
			rtmSessionRef.current = null;
			localCameraPreviewRef.current?.close();
			localCameraPreviewRef.current = null;
			setRoomJoined(false);
			setMembers([]);
			setRemoteRtcUsers([]);
			setMetadata(emptyRoomMetadata());
			setSubtitles([]);
			setMicrophoneMuted(false);
			setCameraEnabled(false);
			if (metadata.closeReason === "expired") {
				setError(t("errors.roomExpiredClosed"));
			}
		};

		void leaveEndedSession();

		return () => {
			cancelled = true;
		};
	}, [metadata.closeReason, metadata.status, roomJoined, t]);

	const displayName = getDisplayName(userInfo);
	const effectiveDisplayName = nickname.trim() || displayName;

	React.useEffect(() => {
		if (!userInfo) {
			return;
		}
		const nextDefaultNickname = getDefaultNickname(userInfo, demoNickname);
		if (
			shouldSyncNicknameWithDefault({
				nickname,
				lastAutoNickname: lastAutoNicknameRef.current,
			})
		) {
			setNickname(nextDefaultNickname);
			lastAutoNicknameRef.current = nextDefaultNickname;
		}
	}, [demoNickname, nickname, userInfo]);

	const isController = metadata.controllerUserId === uidRef.current;
	const shouldStopBeforeLeaving =
		roomJoined &&
		metadata.status === "start" &&
		isController &&
		Boolean(metadata.agentId);
	const canToggleMedia = !busy && !mediaBusy;
	const sttRunning = metadata.status === "start";
	const countdownText =
		metadata.experienceLimitRemoved === true
			? t("developerMode.unlimited")
			: formatCountdown(metadata.startedAt);
	const controllerDisplayName =
		members.find((member) => member.userId === metadata.controllerUserId)
			?.displayName ??
		metadata.controllerUserId ??
		"";
	const sessionLimitLabel =
		metadata.experienceLimitRemoved === true
			? t("developerMode.unlimited")
			: countdownText;
	const developerOverrides = buildDeveloperRequestOverrides(
		developerMode.enabled,
		developerMode.requestOverrides,
	);
	const sttVendor = buildSelectedSttVendorForStart({
		enabled: developerMode.enabled,
		sttVendor: developerMode.sttVendor,
	});

	const startSttAsController = async (
		rtmSession: GroupRtmSession,
		normalizedChannelName: string,
		languageSelection: ValidRoomLanguageSelection,
	) => {
		await rtmSession.withSttLock(async () => {
			const currentMetadata = await rtmSession.getMetadata();
			if (currentMetadata.status === "start") {
				return;
			}
			if (
				currentMetadata.status === "starting" &&
				currentMetadata.controllerUserId &&
				currentMetadata.controllerUserId !== uidRef.current
			) {
				throw new Error(t("errors.channelStarting"));
			}

			await rtmSession.setMetadata({
				...currentMetadata,
				status: "starting",
				controllerUserId: uidRef.current,
				recognitionMode: languageSelection.recognitionMode,
				sourceLanguages: languageSelection.sourceLanguages,
				targetLanguages: languageSelection.targetLanguages,
			});
			try {
				const response = await requestStartSttSession({
					channelName: normalizedChannelName,
					controllerUserId: uidRef.current,
					controllerName: effectiveDisplayName,
					recognitionMode: languageSelection.recognitionMode,
					sourceLanguages: languageSelection.sourceLanguages,
					targetLanguages: languageSelection.targetLanguages,
					enableJsonProtocol: developerMode.subtitleMessageFormat === "json",
					sttVendor,
					developerOverrides,
				});
				await rtmSession.setMetadata(buildStartedRoomMetadata(response));
			} catch (caughtError) {
				const message =
					caughtError instanceof Error
						? caughtError.message
						: t("room.startSttFailed");
				await rtmSession.setMetadata({
					...currentMetadata,
					status: "error",
					controllerUserId: uidRef.current,
					recognitionMode: languageSelection.recognitionMode,
					sourceLanguages: languageSelection.sourceLanguages,
					targetLanguages: languageSelection.targetLanguages,
					error: message,
				});
				throw caughtError;
			}
		});
	};

	const handleJoinRoom = async () => {
		if (!userInfo) {
			setError(t("errors.loginRequired"));
			return;
		}

		const normalizedChannelName = channelName.trim();
		const formCheck = buildPrestartFormCheck({
			mode: prestartMode,
			channelName: normalizedChannelName,
			recognitionMode,
			sourceLanguages,
			targetLanguages,
			messages: {
				invalidChannelName: t("errors.invalidChannelName"),
				selectSourceLanguage: t("errors.selectSourceLanguage"),
				selectTargetLanguage: t("errors.selectTargetLanguage"),
			},
		});
		if (!formCheck.ok) {
			setError(formCheck.message);
			return;
		}

		setBusy(true);
		setError(null);
		try {
			const [{ joinGroupRtcSession }, { joinGroupRtmSession }] =
				await Promise.all([
					import("#/lib/stt-group/client/rtc-client"),
					import("#/lib/stt-group/client/rtm-client"),
				]);
			const rtmToken = await requestRtmToken({ userId: uidRef.current });
			const initialMicrophoneEnabled =
				prestartMicrophoneReady && !microphoneMuted;
			const shouldEnableCameraAfterJoin = cameraEnabled;
			const rtmSession = await joinGroupRtmSession({
				appId: rtmToken.appId,
				userId: uidRef.current,
				rtcUid: uidRef.current,
				token: rtmToken.token,
				channelName: normalizedChannelName,
				displayName: effectiveDisplayName,
				onMembers: setMembers,
				onMetadata: setMetadata,
			});
			rtmSessionRef.current = rtmSession;
			const latestMetadata = await rtmSession.getMetadata();
			const roomAction = resolvePrestartRoomAction({
				mode: prestartMode,
				metadata: latestMetadata,
				formCheck,
				roomNotStartedMessage: t("errors.roomNotStarted"),
			});
			if (roomAction.kind === "reject") {
				throw new Error(roomAction.message);
			}
			const rtcToken = await requestRtcToken({
				channelName: normalizedChannelName,
				uid: uidRef.current,
				developerOverrides,
			});
			const rtcSession = await joinGroupRtcSession({
				appId: rtcToken.appId,
				channelName: normalizedChannelName,
				uid: Number(rtcToken.uid),
				token: rtcToken.token,
				pubBotUid: metadata.pubBotUid,
				initialMicrophoneEnabled,
				subtitleMessageFormat: developerMode.subtitleMessageFormat,
				onSubtitle: (message) => {
					setSubtitles((current) =>
						reduceSubtitleMessage(
							current,
							message,
							Date.now(),
							developerMode.subtitleRenderMode,
						),
					);
				},
				onRemoteUsersChange: setRemoteRtcUsers,
			});
			rtcSessionRef.current = rtcSession;
			if (roomAction.kind === "start") {
				await startSttAsController(
					rtmSession,
					normalizedChannelName,
					roomAction.languageSelection,
				);
			}
			const activeMetadata = await rtmSession.getMetadata();
			rtcSession.setPubBotUid(activeMetadata.pubBotUid);
			setMicrophoneMuted(!initialMicrophoneEnabled);
			if (shouldEnableCameraAfterJoin) {
				localCameraPreviewRef.current?.close();
				localCameraPreviewRef.current = null;
				await rtcSession.setCameraEnabled(true, localVideoElementRef.current);
			}

			setMetadata(activeMetadata);
			setChannelName(normalizedChannelName);
			setRoomJoined(true);
			setSubtitles([]);
		} catch (caughtError) {
			setError(
				caughtError instanceof Error
					? caughtError.message
					: t("room.joinRoomFailed"),
			);
			await rtcSessionRef.current?.leave().catch(() => undefined);
			await rtmSessionRef.current?.leave().catch(() => undefined);
			rtcSessionRef.current = null;
			rtmSessionRef.current = null;
			setMembers([]);
			setRemoteRtcUsers([]);
			setMetadata(emptyRoomMetadata());
		} finally {
			setBusy(false);
		}
	};

	const handleLeaveRoom = async () => {
		setBusy(true);
		setError(null);
		try {
			if (
				rtmSessionRef.current &&
				metadata.agentId &&
				metadata.status === "start" &&
				isController
			) {
				await stopSttAsController(rtmSessionRef.current, metadata, "manual");
			}
			await rtcSessionRef.current?.leave();
			await rtmSessionRef.current?.leave();
			rtcSessionRef.current = null;
			rtmSessionRef.current = null;
			localCameraPreviewRef.current?.close();
			localCameraPreviewRef.current = null;
			setRoomJoined(false);
			setMembers([]);
			setRemoteRtcUsers([]);
			setMetadata(emptyRoomMetadata());
			setSubtitles([]);
			setMicrophoneMuted(false);
			setCameraEnabled(false);
			setPrestartMicrophoneReady(false);
		} catch (caughtError) {
			setError(
				caughtError instanceof Error
					? caughtError.message
					: t("room.leaveRoomFailed"),
			);
		} finally {
			setBusy(false);
		}
	};

	const handleToggleMicrophone = async () => {
		if (!rtcSessionRef.current) {
			if (!prestartMicrophoneReady) {
				setPrestartMicrophoneReady(true);
				setMicrophoneMuted(false);
				return;
			}
			setMicrophoneMuted((current) => {
				const nextMuted = !current;
				setPrestartMicrophoneReady(!nextMuted);
				return nextMuted;
			});
			return;
		}

		const nextMuted = !microphoneMuted;
		setMediaBusy(true);
		setError(null);
		try {
			await rtcSessionRef.current.setMicrophoneMuted(nextMuted);
			setMicrophoneMuted(nextMuted);
		} catch (caughtError) {
			setError(
				caughtError instanceof Error
					? caughtError.message
					: t("room.toggleMicFailed"),
			);
		} finally {
			setMediaBusy(false);
		}
	};

	const handleToggleCamera = async () => {
		if (!rtcSessionRef.current) {
			const nextEnabled = !cameraEnabled;
			setMediaBusy(true);
			setError(null);
			try {
				if (nextEnabled) {
					const { createLocalCameraPreviewSession } = await import(
						"#/lib/stt-group/client/rtc-client"
					);
					const previewSession = await createLocalCameraPreviewSession();
					localCameraPreviewRef.current?.close();
					localCameraPreviewRef.current = previewSession;
					previewSession.play(localVideoElementRef.current);
				} else {
					localCameraPreviewRef.current?.close();
					localCameraPreviewRef.current = null;
				}
				setCameraEnabled(nextEnabled);
				await syncAvailableDevices();
			} catch (caughtError) {
				setError(
					caughtError instanceof Error
						? caughtError.message
						: t("room.toggleCameraFailed"),
				);
			} finally {
				setMediaBusy(false);
			}
			return;
		}

		const nextEnabled = !cameraEnabled;
		setMediaBusy(true);
		setError(null);
		try {
			await rtcSessionRef.current.setCameraEnabled(
				nextEnabled,
				localVideoElementRef.current,
			);
			setCameraEnabled(nextEnabled);
			await syncAvailableDevices();
		} catch (caughtError) {
			setError(
				caughtError instanceof Error
					? caughtError.message
					: t("room.toggleCameraFailed"),
			);
		} finally {
			setMediaBusy(false);
		}
	};

	const stopSttAsController = React.useCallback(
		async (
			rtmSession: GroupRtmSession,
			currentMetadata: SttRoomMetadata,
			closeReason: SttRoomCloseReason,
		) => {
			await rtmSession.withSttLock(async () => {
				await rtmSession.setMetadata({
					...currentMetadata,
					status: "stopping",
				});
				try {
					await requestStopSttSession({
						agentId: currentMetadata.agentId ?? "",
						controllerUserId: uidRef.current,
						roomControllerUserId: currentMetadata.controllerUserId ?? "",
					});
					await rtmSession.setMetadata({
						status: "end",
						closeReason,
					});
				} catch (caughtError) {
					const message =
						caughtError instanceof Error
							? caughtError.message
							: t("room.stopSttFailed");
					await rtmSession.setMetadata({
						...currentMetadata,
						status: "error",
						error: message,
					});
					throw caughtError;
				}
			});
		},
		[t],
	);

	React.useEffect(() => {
		if (
			!roomJoined ||
			!isController ||
			metadata.status !== "start" ||
			!metadata.startedAt ||
			metadata.experienceLimitRemoved === true ||
			!rtmSessionRef.current
		) {
			return;
		}

		const remainingMs =
			metadata.startedAt + DEFAULT_EXPERIENCE_SECONDS * 1000 - Date.now();

		if (remainingMs <= 0) {
			void stopSttAsController(rtmSessionRef.current, metadata, "expired");
			return;
		}

		const timeoutId = window.setTimeout(() => {
			if (!rtmSessionRef.current) {
				return;
			}
			void stopSttAsController(rtmSessionRef.current, metadata, "expired");
		}, remainingMs);

		return () => window.clearTimeout(timeoutId);
	}, [isController, metadata, roomJoined, stopSttAsController]);

	const handleLogout = () => {
		redirectToSsoLogout();
	};

	const handleStopRequest = () => {
		if (shouldStopBeforeLeaving) {
			setActiveOverlay("confirm-stop");
			return;
		}
		void handleLeaveRoom();
	};

	const handleLogoSelected = (file: File) => {
		if (!isSupportedLogoFile(file)) {
			setError(t("branding.logoFileTypeUnsupported"));
			return;
		}
		setPendingLogoFile(file);
	};

	const handleLogoConfirmed = (dataUrl: string, file: File) => {
		setDraftBrandSettings(
			createBrandSettings({
				...draftBrandSettings,
				logoAsset: {
					dataUrl,
					mimeType: file.type,
					name: file.name,
				},
			}),
		);
		setPendingLogoFile(null);
	};

	const handleOpenSkinSettings = () => {
		setDraftBrandSettings(createBrandSettings(brandSettings));
		setPendingLogoFile(null);
		setActiveOverlay("skin-settings");
	};

	const handleCloseOverlay = () => {
		if (activeOverlay === "skin-settings") {
			setDraftBrandSettings(createBrandSettings(brandSettings));
			setPendingLogoFile(null);
		}
		setActiveOverlay(null);
	};

	React.useEffect(() => {
		document.body.dataset.activeOverlay = activeOverlay ?? "";
		return () => {
			delete document.body.dataset.activeOverlay;
		};
	}, [activeOverlay]);

	const handleConfirmBrandSettings = () => {
		setBrandSettings(createBrandSettings(draftBrandSettings));
		setPendingLogoFile(null);
		setActiveOverlay(null);
		setBrandingToast(t("branding.skinSettingsSaved"));
	};

	const handleConfirmedStop = () => {
		setActiveOverlay(null);
		void handleLeaveRoom();
	};

	const handleRecognitionModeChange = (mode: PrestartRecognitionMode) => {
		setPrestartRecognitionMode(mode);
		if (mode === "auto") {
			setRecognitionMode("auto");
			setSourceLanguages([]);
			return;
		}
		const nextSourceLanguages = resolveSourceLanguagesForRecognitionModeChange({
			currentMode: prestartRecognitionMode,
			nextMode: mode,
			sourceLanguages,
		});
		const nextRecognitionMode: RecognitionMode =
			mode === "multi" ? "multi" : "single";
		const nextSources =
			nextRecognitionMode === "single"
				? nextSourceLanguages.slice(0, 1)
				: nextSourceLanguages;
		const nextTargets =
			nextRecognitionMode === "single" && nextSources[0]
				? targetLanguages.filter((language) => language !== nextSources[0])
				: targetLanguages;
		setRecognitionMode(nextRecognitionMode);
		setSourceLanguages(nextSources);
		setTargetLanguages(nextTargets);
	};

	const handleSourceLanguagesChange = (languages: LanguageCode[]) => {
		const nextSources =
			recognitionMode === "single" ? languages.slice(0, 1) : languages;
		const nextTargets =
			recognitionMode === "single" && nextSources[0]
				? targetLanguages.filter((language) => language !== nextSources[0])
				: targetLanguages;
		setSourceLanguages(nextSources);
		setTargetLanguages(nextTargets);
	};

	const handleTargetLanguagesChange = (languages: LanguageCode[]) => {
		setTargetLanguages(languages);
	};

	const handleExportSourceVtt = async () => {
		if (!metadata.sessionId) {
			setError(t("errors.noVttAvailable"));
			return;
		}

		try {
			setError(null);
			await listSessionVtt({
				channelName,
				sessionId: metadata.sessionId,
				type: "source",
			});
			const blob = await downloadSessionVttZip({
				channelName,
				sessionId: metadata.sessionId,
				type: "source",
			});
			downloadBlobFile({
				blob,
				filename: `${channelName}-source-vtt.zip`,
			});
		} catch (caughtError) {
			setError(
				caughtError instanceof Error
					? caughtError.message
					: t("errors.noVttAvailable"),
			);
		}
	};

	const handleExportTargetVtt = async () => {
		if (!metadata.sessionId) {
			setError(t("errors.noVttAvailable"));
			return;
		}

		try {
			setError(null);
			await listSessionVtt({
				channelName,
				sessionId: metadata.sessionId,
				type: "target",
				targetLanguage: targetLanguages[0],
			});
			const blob = await downloadSessionVttZip({
				channelName,
				sessionId: metadata.sessionId,
				type: "target",
				targetLanguage: targetLanguages[0],
			});
			downloadBlobFile({
				blob,
				filename: `${channelName}-target-vtt.zip`,
			});
		} catch (caughtError) {
			setError(
				caughtError instanceof Error
					? caughtError.message
					: t("errors.noVttAvailable"),
			);
		}
	};

	const productStage = (
		<SubtitleStage
			roomJoined={roomJoined}
			sttRunning={sttRunning}
			sourceLanguages={sourceLanguages}
			targetLanguages={targetLanguages}
			activeTargetLanguage={activeTargetLanguage}
			subtitleRenderMode={developerMode.subtitleRenderMode}
			displayMode={displayMode}
			lines={subtitles}
			members={members}
			showVttExport={developerMode.enabled && developerMode.showVttExport}
			onDisplayModeChange={setDisplayMode}
			onActiveTargetLanguageChange={setActiveTargetLanguage}
			onExportSourceVtt={handleExportSourceVtt}
			onExportTargetVtt={handleExportTargetVtt}
		/>
	);

	const renderPrestartSide = ({
		forceBusy = false,
		forceCanStart = true,
	}: {
		forceBusy?: boolean;
		forceCanStart?: boolean;
	} = {}) => (
		<PrestartPanel
			mode={prestartMode}
			channelName={channelName}
			nickname={nickname}
			recognitionMode={prestartRecognitionMode}
			sourceLanguages={sourceLanguages}
			targetLanguages={targetLanguages}
			microphoneDevices={microphoneDevices}
			selectedMicrophoneDeviceId={selectedMicrophoneDeviceId}
			cameraDevices={cameraDevices}
			selectedCameraDeviceId={selectedCameraDeviceId}
			subtitleDisplayMode={displayMode}
			busy={forceBusy || busy}
			canStart={!roomJoined && !forceBusy && !busy && forceCanStart}
			microphoneMuted={microphoneMuted}
			cameraEnabled={cameraEnabled}
			microphoneReady={prestartMicrophoneReady}
			onChannelNameChange={setChannelName}
			onNicknameChange={setNickname}
			onRecognitionModeChange={handleRecognitionModeChange}
			onSourceLanguagesChange={handleSourceLanguagesChange}
			onTargetLanguagesChange={handleTargetLanguagesChange}
			onSubtitleDisplayModeChange={setDisplayMode}
			onSelectMicrophoneDevice={setSelectedMicrophoneDeviceId}
			onSelectCameraDevice={setSelectedCameraDeviceId}
			onToggleMicrophone={handleToggleMicrophone}
			onToggleCamera={handleToggleCamera}
			onStart={handleJoinRoom}
			onModeChange={setPrestartMode}
			onRandomChannelName={() => setChannelName(createDefaultChannelName())}
			onOpenAdvanced={() => setActiveOverlay("advanced")}
			localVideoRef={localVideoRef}
		/>
	);

	const productSide = roomJoined ? (
		<ParticipantsPanel
			members={members}
			remoteRtcUsers={remoteRtcUsers}
			localUserId={uidRef.current}
			controllerUserId={metadata.controllerUserId}
			controllerDisplayName={controllerDisplayName}
			sessionLimitLabel={sessionLimitLabel}
			channelName={channelName}
			recognitionMode={recognitionMode}
			sourceLanguages={sourceLanguages}
			targetLanguages={targetLanguages}
			subtitleDisplayMode={displayMode}
			microphoneMuted={microphoneMuted}
			cameraEnabled={cameraEnabled}
			localVideoRef={localVideoRef}
		/>
	) : (
		renderPrestartSide()
	);

	if (authLoading) {
		return <main className="stt-loading-screen" aria-hidden="true" />;
	}

	if (!userInfo) {
		return <main className="stt-loading-screen" aria-hidden="true" />;
	}

	return (
		<ProductShell
			brandName={brandSettings.productName}
			brandLogoUrl={brandSettings.logoAsset?.dataUrl ?? null}
			displayName={effectiveDisplayName}
			avatarLabel={getAvatarLabel(effectiveDisplayName)}
			avatarTitle={getAvatarTitle(effectiveDisplayName)}
			avatarDisplayText={getAvatarDisplayText(effectiveDisplayName)}
			channelName={channelName}
			uid={uidRef.current}
			agentId={metadata.agentId}
			roomJoined={roomJoined}
			sttRunning={sttRunning}
			countdownText={countdownText}
			developerModeUnlocked={developerMode.unlocked}
			developerModeEnabled={developerMode.enabled}
			developerModeBadgeLabel={t("developerMode.badge")}
			sidePanelVisible={sidePanelVisible}
			onBack={() => {
				window.location.href = "/";
			}}
			onSidePanelToggle={() => setSidePanelVisible((current) => !current)}
			onLogout={handleLogout}
			onOpenPlugin={() => setActiveOverlay("plugin")}
			onOpenQr={() => setActiveOverlay("qr")}
			onOpenSkinSettings={handleOpenSkinSettings}
			onDeveloperModeEntry={() => {
				unlock();
				setDeveloperModeOpen(true);
			}}
			onOpenDeveloperMode={() => setDeveloperModeOpen(true)}
			stage={productStage}
			side={productSide}
			dock={
				<ControlDock
					visible={roomJoined}
					microphoneMuted={microphoneMuted}
					cameraEnabled={cameraEnabled}
					busy={busy || !canToggleMedia}
					canStop={roomJoined}
					onToggleMicrophone={handleToggleMicrophone}
					onToggleCamera={handleToggleCamera}
					onStop={handleStopRequest}
				/>
			}
			overlays={
				<>
					<DeveloperModePanel
						open={developerModeOpen}
						onClose={() => setDeveloperModeOpen(false)}
						canRemoveExperienceLimit={
							roomJoined && metadata.status === "start" && isController
						}
						experienceLimitAlreadyRemoved={
							metadata.experienceLimitRemoved === true
						}
						onRemoveExperienceLimit={() => {
							if (
								!rtmSessionRef.current ||
								metadata.status !== "start" ||
								!isController
							) {
								return;
							}
							setError(null);
							void rtmSessionRef.current
								.withSttLock(async () => {
									const latestMetadata =
										await rtmSessionRef.current?.getMetadata();
									if (!latestMetadata || latestMetadata.status !== "start") {
										return;
									}
									await rtmSessionRef.current?.setMetadata({
										...latestMetadata,
										experienceLimitRemoved: true,
									});
								})
								.catch((caughtError) => {
									setError(
										caughtError instanceof Error
											? caughtError.message
											: t("errors.removeExperienceLimitFailed"),
									);
								});
						}}
					/>
					<AccessOverlays
						channelName={channelName}
						activeOverlay={activeOverlay}
						brandSettings={draftBrandSettings}
						pendingLogoFile={pendingLogoFile}
						viewerUrl={viewerUrl}
						viewerLinkLoading={viewerLinkLoading}
						viewerLinkError={viewerLinkError}
						onBrandSettingsChange={(next) =>
							setDraftBrandSettings(createBrandSettings(next))
						}
						onConfirmBrandSettings={handleConfirmBrandSettings}
						onLogoSelected={handleLogoSelected}
						onLogoReedit={setPendingLogoFile}
						onLogoCanceled={() => setPendingLogoFile(null)}
						onLogoConfirmed={handleLogoConfirmed}
						onClose={handleCloseOverlay}
						onConfirmStop={handleConfirmedStop}
					/>
					{brandingToast ? (
						<div className="toast success">{brandingToast}</div>
					) : null}
					{error ? <div className="toast error">{error}</div> : null}
					{metadata.error ? (
						<div className="toast warning">{metadata.error}</div>
					) : null}
					{metadata.startedAt ? (
						<div className="sr-only">
							{t("errors.sessionStartedAt", {
								time: formatTime(metadata.startedAt, locale),
							})}
						</div>
					) : null}
				</>
			}
		/>
	);
}
