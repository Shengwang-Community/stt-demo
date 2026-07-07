import { Camera, CameraOff, Mic, MicOff } from "lucide-react";
import * as React from "react";
import { useT } from "#/lib/i18n";
import {
	getLanguageLabel,
	isParticipantLimitReached,
	type LanguageCode,
	type RecognitionMode,
	type SttRoomMember,
} from "#/lib/stt-group";
import type { RemoteRtcUser } from "#/lib/stt-group/client/rtc-client";
import type { SubtitleDisplayMode } from "./subtitle-stage";

export type ParticipantsPanelProps = {
	members: SttRoomMember[];
	remoteRtcUsers: RemoteRtcUser[];
	localUserId: string;
	controllerUserId?: string;
	controllerDisplayName?: string;
	sessionLimitLabel: string;
	channelName: string;
	recognitionMode: RecognitionMode;
	sourceLanguages: LanguageCode[];
	targetLanguages: LanguageCode[];
	subtitleDisplayMode: SubtitleDisplayMode;
	microphoneMuted: boolean;
	cameraEnabled: boolean;
	localVideoRef: (element: HTMLDivElement | null) => void;
};

const subtitleDisplayModeLabel = (
	mode: SubtitleDisplayMode,
	t: ReturnType<typeof useT>,
) => {
	const labels: Record<SubtitleDisplayMode, string> = {
		both: t("participants.subtitleModeBoth"),
		source: t("participants.subtitleModeSource"),
		target: t("participants.subtitleModeTarget"),
	};
	return labels[mode];
};

const MAX_COLLAPSED_PARTICIPANTS = 6;

type ParticipantDisplayMember = {
	member: SttRoomMember;
	isSelf: boolean;
	isController: boolean;
	audioEnabled: boolean;
	videoEnabled: boolean;
	remoteRtcUser?: RemoteRtcUser;
};

export function ParticipantsPanel({
	members,
	remoteRtcUsers,
	localUserId,
	controllerUserId,
	controllerDisplayName,
	sessionLimitLabel,
	channelName,
	recognitionMode,
	sourceLanguages,
	targetLanguages,
	subtitleDisplayMode,
	microphoneMuted,
	cameraEnabled,
	localVideoRef,
}: ParticipantsPanelProps) {
	const t = useT();
	const [tab, setTab] = React.useState<"participants" | "settings">(
		"participants",
	);
	const [participantsExpanded, setParticipantsExpanded] = React.useState(false);
	const participantCount = members.length;
	const full = isParticipantLimitReached(participantCount);
	const remoteRtcUserByUid = new Map(
		remoteRtcUsers.map((user) => [String(user.uid), user]),
	);
	const sortedMembers = members
		.map((member) => {
			const remoteRtcUser = member.rtcUid
				? remoteRtcUserByUid.get(String(member.rtcUid))
				: undefined;
			const isSelf = member.userId === localUserId;
			return {
				member,
				isSelf,
				isController: member.userId === controllerUserId,
				audioEnabled: isSelf
					? !microphoneMuted
					: Boolean(remoteRtcUser?.audioTrack),
				videoEnabled: isSelf
					? cameraEnabled
					: Boolean(remoteRtcUser?.videoTrack),
				remoteRtcUser,
			} satisfies ParticipantDisplayMember;
		})
		.sort((a, b) => {
			const byRank = getParticipantRank(a) - getParticipantRank(b);
			if (byRank !== 0) {
				return byRank;
			}
			return (a.member.joinedAt ?? 0) - (b.member.joinedAt ?? 0);
		});
	const visibleMembers = participantsExpanded
		? sortedMembers
		: sortedMembers.slice(0, MAX_COLLAPSED_PARTICIPANTS);
	const hiddenParticipantCount = Math.max(
		0,
		sortedMembers.length - visibleMembers.length,
	);

	return (
		<aside
			className="side-panel glass stt-participants-panel stt-participants-panel--session"
			data-migrated-component="ParticipantsPanel"
			aria-label={t("participants.panelLabel")}
		>
			<div className="seg stt-participants-panel__tabs" role="tablist">
				<button
					className={
						tab === "participants" ? "seg-btn active is-active" : "seg-btn"
					}
					type="button"
					role="tab"
					aria-selected={tab === "participants"}
					onClick={() => setTab("participants")}
				>
					{t("participants.participantsTab")}
				</button>
				<button
					className={
						tab === "settings" ? "seg-btn active is-active" : "seg-btn"
					}
					type="button"
					role="tab"
					aria-selected={tab === "settings"}
					onClick={() => setTab("settings")}
				>
					{t("participants.settingsTab")}
				</button>
			</div>
			<div className="seg-body">
				{tab === "participants" ? (
					<div className="participants-tab">
						<div className="participants-head">
							<strong>{t("participants.participantsTitle")}</strong>
							<span className="count mono">{participantCount} ONLINE</span>
						</div>
						{full ? (
							<div className="limit-warning">{t("participants.roomFull")}</div>
						) : null}
						<div className="p-list">
							{sortedMembers.length === 0 ? (
								<p className="empty-note">{t("participants.noParticipants")}</p>
							) : (
								visibleMembers.map((displayMember) => (
									<ParticipantCard
										key={displayMember.member.userId}
										displayMember={displayMember}
										localVideoRef={localVideoRef}
									/>
								))
							)}
						</div>
						{sortedMembers.length > MAX_COLLAPSED_PARTICIPANTS ? (
							<button
								className="show-more"
								type="button"
								onClick={() => setParticipantsExpanded((expanded) => !expanded)}
							>
								<span>
									{participantsExpanded
										? `参会者 ${participantCount}`
										: `参会者 +${hiddenParticipantCount}`}
								</span>
								<span>{participantsExpanded ? "收起" : "展开"}</span>
							</button>
						) : null}
					</div>
				) : (
					<div className="summary stt-session-settings">
						<section className="stt-session-settings__group">
							<h3>{t("participants.sessionOverview")}</h3>
							<div className="summary-row">
								<span className="summary-key">{t("participants.roomId")}</span>
								<span className="summary-value mono">{channelName}</span>
							</div>
							<div className="summary-row">
								<span className="summary-key">
									{t("participants.controllerTag")}
								</span>
								<span className="summary-value">
									{controllerDisplayName || t("participants.noParticipants")}
								</span>
							</div>
							<div className="summary-row">
								<span className="summary-key">
									{t("participants.sessionLimit")}
								</span>
								<span className="summary-value">{sessionLimitLabel}</span>
							</div>
						</section>
						<section className="stt-session-settings__group">
							<h3>{t("participants.languageSettings")}</h3>
							<div className="summary-row">
								<span className="summary-key">
									{t("participants.recognitionMode")}
								</span>
								<span className="summary-value">
									{recognitionMode === "multi"
										? t("participants.recognitionModeMulti")
										: recognitionMode === "auto"
											? t("participants.recognitionModeAuto")
											: t("participants.recognitionModeSingle")}
								</span>
							</div>
							<div className="summary-row">
								<span className="summary-key">
									{t("participants.sourceLanguages")}
								</span>
								<span className="summary-value summary-value--language-list">
									{sourceLanguages.map(getLanguageLabel).join(", ")}
								</span>
							</div>
							<div className="summary-row">
								<span className="summary-key">
									{t("participants.targetLanguages")}
								</span>
								<span className="summary-value summary-value--language-list">
									{targetLanguages.map(getLanguageLabel).join(", ")}
								</span>
							</div>
							<div className="summary-row">
								<span className="summary-key">
									{t("participants.subtitleMode")}
								</span>
								<span className="summary-value">
									{subtitleDisplayModeLabel(subtitleDisplayMode, t)}
								</span>
							</div>
						</section>
					</div>
				)}
			</div>
		</aside>
	);
}

function getParticipantRank(displayMember: ParticipantDisplayMember) {
	if (displayMember.isSelf) {
		return 0;
	}
	if (displayMember.videoEnabled) {
		return 1;
	}
	if (displayMember.audioEnabled) {
		return 2;
	}
	return 3;
}

function ParticipantCard({
	displayMember,
	localVideoRef,
}: {
	displayMember: ParticipantDisplayMember;
	localVideoRef: ParticipantsPanelProps["localVideoRef"];
}) {
	const t = useT();
	const {
		member,
		isSelf,
		isController,
		audioEnabled,
		videoEnabled,
		remoteRtcUser,
	} = displayMember;
	const isVideoCard = isSelf || videoEnabled;
	const roleLabel = getParticipantRoleLabel(displayMember, t);
	const participantInitial = member.displayName.slice(0, 1).toUpperCase();
	const cardClassName = isVideoCard
		? "p-card video stt-participant-video-card"
		: "p-card audio stt-participant-video-card stt-participant-video-card--audio";

	if (!isVideoCard) {
		return (
			<article
				className={cardClassName}
				data-self={isSelf}
				data-active={isController}
				data-has-role={Boolean(roleLabel)}
			>
				<div className="p-avatar stt-participant-avatar">
					{participantInitial}
				</div>
				<ParticipantInfo name={member.displayName} roleLabel={roleLabel} />
				<ParticipantMediaStatus
					audioEnabled={audioEnabled}
					videoEnabled={videoEnabled}
				/>
			</article>
		);
	}

	return (
		<article
			className={cardClassName}
			data-self={isSelf}
			data-active={isController}
			data-has-role={Boolean(roleLabel)}
			data-video={videoEnabled ? "on" : "off"}
		>
			<div className="p-video stt-participant-video-card__image">
				{isSelf ? (
					<div
						ref={localVideoRef}
						className="local-video-preview p-video-preview"
					/>
				) : videoEnabled ? (
					<RemoteVideoPreview
						videoTrack={remoteRtcUser?.videoTrack}
						className="p-video-preview"
					/>
				) : null}
				<div className="p-video-avatar stt-participant-video-card__audio">
					<div className="p-avatar stt-participant-avatar">
						{participantInitial}
					</div>
				</div>
				<div className="p-video-meta stt-participant-video-card__bar">
					<ParticipantInfo name={member.displayName} roleLabel={roleLabel} />
					<ParticipantMediaStatus
						audioEnabled={audioEnabled}
						videoEnabled={videoEnabled}
					/>
				</div>
			</div>
		</article>
	);
}

function getParticipantRoleLabel(
	displayMember: ParticipantDisplayMember,
	t: ReturnType<typeof useT>,
) {
	if (displayMember.isSelf && displayMember.isController) {
		return `${t("participants.selfTag")} · ${t("participants.controllerTag")}`;
	}
	if (displayMember.isSelf) {
		return t("participants.selfTag");
	}
	if (displayMember.isController) {
		return t("participants.controllerTag");
	}
	return "";
}

function ParticipantInfo({
	name,
	roleLabel,
}: {
	name: string;
	roleLabel: string;
}) {
	return (
		<div className="p-info">
			<div className="p-name">{name}</div>
			{roleLabel ? <div className="p-role">{roleLabel}</div> : null}
		</div>
	);
}

function ParticipantMediaStatus({
	audioEnabled,
	videoEnabled,
}: {
	audioEnabled: boolean;
	videoEnabled: boolean;
}) {
	const t = useT();
	return (
		<div className="p-icons">
			<span
				className="p-media-icon"
				data-ready={audioEnabled}
				title={
					audioEnabled
						? t("participants.audioConnected")
						: t("participants.audioDisconnected")
				}
			>
				{audioEnabled ? <Mic size={14} /> : <MicOff size={14} />}
			</span>
			<span
				className="p-media-icon"
				data-ready={videoEnabled}
				title={
					videoEnabled
						? t("participants.cameraOn")
						: t("participants.cameraOff")
				}
			>
				{videoEnabled ? <Camera size={14} /> : <CameraOff size={14} />}
			</span>
		</div>
	);
}

function RemoteVideoPreview({
	videoTrack,
	className = "remote-video-preview",
}: {
	videoTrack: RemoteRtcUser["videoTrack"];
	className?: string;
}) {
	const previewRef = React.useRef<HTMLDivElement | null>(null);

	React.useLayoutEffect(() => {
		if (!videoTrack || !previewRef.current) {
			return;
		}

		try {
			videoTrack.play(previewRef.current, { fit: "cover" });
		} catch (error) {
			console.error("Failed to play remote video track", error);
		}

		return () => {
			videoTrack.stop();
		};
	}, [videoTrack]);

	return <div ref={previewRef} className={className} />;
}
