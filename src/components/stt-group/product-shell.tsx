import {
	ChevronDown,
	Copy,
	Info,
	Languages,
	LogOut,
	Palette,
	PanelRight,
	QrCode,
} from "lucide-react";
import * as React from "react";
import logoUrl from "#/assets/agora-logo.svg";
import { useDismissibleLayer } from "#/hooks/use-dismissible-layer";
import { useT } from "#/lib/i18n";
import { LocaleSwitchMenu } from "./locale-switch-menu";

export type ProductShellProps = {
	brandName: string;
	brandLogoUrl: string | null;
	displayName: string;
	avatarLabel: string;
	avatarTitle: string;
	avatarDisplayText: string;
	channelName: string;
	uid?: string;
	agentId?: string;
	roomJoined: boolean;
	sttRunning: boolean;
	countdownText: string;
	developerModeUnlocked: boolean;
	developerModeEnabled: boolean;
	developerModeBadgeLabel: string;
	sidePanelVisible: boolean;
	onBack?: () => void;
	onSidePanelToggle: () => void;
	onLogout: () => void;
	onOpenPlugin: () => void;
	onOpenQr: () => void;
	onOpenSkinSettings?: () => void;
	onDeveloperModeEntry: () => void;
	onOpenDeveloperMode: () => void;
	stage: React.ReactNode;
	side: React.ReactNode;
	dock: React.ReactNode;
	overlays: React.ReactNode;
};

export function ProductShell({
	brandName,
	brandLogoUrl,
	displayName,
	avatarLabel,
	avatarTitle,
	avatarDisplayText,
	channelName,
	uid = "",
	agentId,
	roomJoined,
	sttRunning,
	countdownText,
	developerModeUnlocked,
	developerModeEnabled,
	developerModeBadgeLabel,
	sidePanelVisible,
	onBack,
	onSidePanelToggle,
	onLogout,
	onOpenPlugin,
	onOpenQr,
	onOpenSkinSettings,
	onDeveloperModeEntry,
	onOpenDeveloperMode,
	stage,
	side,
	dock,
	overlays,
}: ProductShellProps) {
	void displayName;
	void avatarLabel;
	void developerModeUnlocked;
	void onOpenSkinSettings;
	const [accessOpen, setAccessOpen] = React.useState(false);
	const [avatarOpen, setAvatarOpen] = React.useState(false);
	const [sessionInfoOpen, setSessionInfoOpen] = React.useState(false);
	const [localeOpen, setLocaleOpen] = React.useState(false);
	const clickTimestampsRef = React.useRef<number[]>([]);
	const t = useT();
	const sessionInfoPopoverRef = useDismissibleLayer({
		open: sessionInfoOpen,
		onDismiss: () => setSessionInfoOpen(false),
	});
	const avatarPopoverRef = useDismissibleLayer({
		open: avatarOpen,
		onDismiss: () => setAvatarOpen(false),
	});
	const sessionInfoRows = [
		{ key: "room", label: t("appShell.roomName"), value: channelName },
		{ key: "uid", label: t("appShell.uid"), value: uid },
		{
			key: "agentId",
			label: t("appShell.agentId"),
			value: agentId || t("appShell.agentIdPending"),
		},
	];

	const openAccess = (callback: () => void) => {
		setAccessOpen(false);
		callback();
	};

	const handleAccessToggle = () => {
		setAvatarOpen(false);
		setSessionInfoOpen(false);
		setLocaleOpen(false);
		setAccessOpen((current) => !current);
	};

	const handleAvatarToggle = () => {
		setAccessOpen(false);
		setSessionInfoOpen(false);
		setLocaleOpen(false);
		setAvatarOpen((current) => !current);
	};

	const handleSessionInfoToggle = () => {
		setAccessOpen(false);
		setAvatarOpen(false);
		setLocaleOpen(false);
		setSessionInfoOpen((current) => !current);
	};

	const handleDeveloperModeEntry = () => {
		const now = Date.now();
		const recent = clickTimestampsRef.current.filter(
			(value) => now - value <= 2000,
		);
		recent.push(now);
		clickTimestampsRef.current = recent;
		if (recent.length >= 5) {
			clickTimestampsRef.current = [];
			onDeveloperModeEntry();
		}
	};

	return (
		<main className="stt-product-page">
			<div className="bg-fx" aria-hidden="true">
				<div className="bg-vignette" />
				<div className="bg-grid" />
				<div className="bg-glow bg-glow--brand" />
				<div className="bg-glow bg-glow--cyan" />
			</div>

			<section
				className="product"
				id="pageProduct"
				data-session={roomJoined ? "true" : "false"}
			>
				<header
					className="topbar glass stt-top-status"
					data-migrated-component="TopStatusBar"
				>
					<div className="tb-left stt-top-status__brand">
						{!roomJoined && onBack ? (
							<button
								className="tool-btn icon-only prestart-back-btn"
								type="button"
								aria-label={t("appShell.backHome")}
								onClick={onBack}
							>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									aria-hidden="true"
								>
									<path
										d="m12 19-7-7 7-7"
										stroke="currentColor"
										strokeWidth="1.8"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<path
										d="M19 12H5"
										stroke="currentColor"
										strokeWidth="1.8"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</button>
						) : null}
						<div className="brand tight">
							<button
								className="brand-mark brand-mark-button"
								type="button"
								aria-label={t("developerMode.hiddenEntry")}
								onClick={handleDeveloperModeEntry}
							>
								<img
									src={brandLogoUrl ?? logoUrl}
									alt=""
									className={
										brandLogoUrl
											? "brand-logo"
											: "brand-logo brand-logo--default"
									}
								/>
							</button>
							<div className="brand-stack">
								<div className="brand-stack-heading">
									<button
										className="brand-title-button"
										type="button"
										aria-label={t("developerMode.hiddenEntry")}
										onClick={handleDeveloperModeEntry}
									>
										<strong>{brandName}</strong>
									</button>
									{developerModeEnabled ? (
										<button
											type="button"
											className="developer-mode-badge"
											onClick={onOpenDeveloperMode}
										>
											{developerModeBadgeLabel}
										</button>
									) : null}
								</div>
								<div
									className={
										roomJoined ? "brand-room mono" : "brand-room mono hidden"
									}
								>
									<span>{channelName}</span>
									<button
										className="copy-btn"
										type="button"
										aria-label={t("appShell.copyRoomId")}
										onClick={() =>
											void navigator.clipboard?.writeText(channelName)
										}
									>
										<Copy size={11} />
									</button>
									<div
										className="pop-anchor brand-room-info-anchor"
										ref={sessionInfoPopoverRef}
									>
										<button
											className="copy-btn brand-room-info-btn"
											type="button"
											aria-label={t("appShell.sessionInfo")}
											aria-haspopup="menu"
											aria-expanded={sessionInfoOpen}
											onClick={handleSessionInfoToggle}
										>
											<Info size={11} />
										</button>
										{sessionInfoOpen ? (
											<div
												className="pop brand-room-info-pop"
												role="menu"
												aria-label={t("appShell.sessionInfo")}
											>
												{sessionInfoRows.map((row) => (
													<div className="session-info-row" key={row.key}>
														<span>{row.label}</span>
														<strong>{row.value}</strong>
														<button
															className="session-info-copy"
															type="button"
															aria-label={t("appShell.copySessionInfoValue", {
																label: row.label,
															})}
															onClick={() =>
																void navigator.clipboard?.writeText(row.value)
															}
														>
															<Copy size={12} />
														</button>
													</div>
												))}
											</div>
										) : null}
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="tb-right stt-top-status__tools">
						{roomJoined ? (
							<div className="status-pill stt-top-status__status">
								<span className={sttRunning ? "dot-live" : "dot-live muted"} />
								<span>
									{sttRunning
										? t("appShell.freeTrial")
										: t("appShell.waitingForCaptions")}
								</span>
								<span className="tb-divider" />
								<span className="mono">{countdownText}</span>
							</div>
						) : null}

						<div className={roomJoined ? "pop-anchor" : "pop-anchor hidden"}>
							<button
								className="tool-btn stt-arrow-button stt-top-status__plugin"
								type="button"
								aria-haspopup="menu"
								aria-expanded={accessOpen}
								onClick={handleAccessToggle}
							>
								<QrCode size={14} />
								<span>{t("appShell.scanCaptions")}</span>
								<ChevronDown size={12} />
							</button>
							{accessOpen ? (
								<div className="pop" role="menu">
									<button
										className="pop-item"
										type="button"
										role="menuitem"
										onClick={() => openAccess(onOpenQr)}
									>
										<span className="pop-item-main">
											<span>{t("appShell.scanCaptions")}</span>
										</span>
										<span className="pop-meta">{t("appShell.mobileMeta")}</span>
									</button>
								</div>
							) : null}
						</div>

						<button
							className={
								roomJoined
									? "tool-btn icon-only stt-top-status__square-button"
									: "tool-btn icon-only stt-top-status__square-button hidden"
							}
							type="button"
							aria-label={
								sidePanelVisible
									? t("appShell.hideSidebar")
									: t("appShell.showSidebar")
							}
							onClick={onSidePanelToggle}
						>
							<PanelRight size={16} />
						</button>

						<LocaleSwitchMenu
							buttonClassName="stt-topbar-locale-btn stt-top-status__square-button"
							menuClassName="stt-topbar-locale-pop"
							optionClassName="stt-topbar-locale-option"
							checkClassName="stt-topbar-locale-check"
							optionContentClassName="stt-topbar-locale-option-label"
							menuRole="listbox"
							open={localeOpen}
							onOpenChange={(nextOpen) => {
								if (nextOpen) {
									setAccessOpen(false);
									setAvatarOpen(false);
									setSessionInfoOpen(false);
								}
								setLocaleOpen(nextOpen);
							}}
							icon={<Languages size={16} strokeWidth={1.9} />}
						/>

						<div className="pop-anchor" ref={avatarPopoverRef}>
							<button
								className="avatar-btn stt-top-status__avatar"
								type="button"
								aria-haspopup="menu"
								aria-expanded={avatarOpen}
								title={avatarTitle}
								onClick={handleAvatarToggle}
							>
								{avatarDisplayText}
							</button>
							{avatarOpen ? (
								<div className="pop right" role="menu">
									<button
										className="pop-item"
										type="button"
										role="menuitem"
										onClick={() => {
											setAvatarOpen(false);
											onOpenPlugin();
										}}
									>
										<span className="pop-item-main">
											<QrCode size={14} />
											<span>{t("appShell.floatingCaptionsPlugin")}</span>
										</span>
									</button>
									<button
										className="pop-item"
										type="button"
										role="menuitem"
										onClick={() => {
											setAvatarOpen(false);
											onOpenSkinSettings?.();
										}}
									>
										<span className="pop-item-main">
											<Palette size={14} />
											<span>{t("appShell.skinSettings")}</span>
										</span>
									</button>
									<button
										className="pop-item"
										type="button"
										role="menuitem"
										onClick={onLogout}
									>
										<span className="pop-item-main">
											<LogOut size={14} />
											<span>{t("appShell.logout")}</span>
										</span>
									</button>
								</div>
							) : null}
						</div>
					</div>
				</header>

				<div className={sidePanelVisible ? "layout" : "layout panel-hidden"}>
					<section className="stage-area">
						{stage}
						{dock}
					</section>
					<aside className="side-area">{side}</aside>
				</div>
			</section>

			{overlays}
		</main>
	);
}
