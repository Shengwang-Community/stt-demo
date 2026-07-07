import { Languages, LogOut, Palette } from "lucide-react";
import * as React from "react";
import logoUrl from "#/assets/agora-logo.svg";
import { useDismissibleLayer } from "#/hooks/use-dismissible-layer";
import { useT } from "#/lib/i18n";
import { LocaleSwitchMenu } from "./locale-switch-menu";

const waveKeys = [
	"wave-1",
	"wave-2",
	"wave-3",
	"wave-4",
	"wave-5",
	"wave-6",
	"wave-7",
];

export function LandingPage({
	onLogin,
	onPrimaryAction,
	onLogout,
	onOpenSkinSettings,
	onOpenPlugin,
	brandName,
	brandLogoUrl,
	avatarLabel,
	loggedIn = false,
}: {
	onLogin: () => void;
	onPrimaryAction: () => void;
	onLogout?: () => void;
	onOpenSkinSettings?: () => void;
	onOpenPlugin?: () => void;
	brandName?: string;
	brandLogoUrl?: string | null;
	avatarLabel?: string;
	loggedIn?: boolean;
}) {
	const t = useT();
	const [avatarOpen, setAvatarOpen] = React.useState(false);
	const avatarPopoverRef = useDismissibleLayer({
		open: avatarOpen,
		onDismiss: () => setAvatarOpen(false),
	});

	React.useEffect(() => {
		if (
			typeof window === "undefined" ||
			typeof window.matchMedia !== "function"
		) {
			return;
		}

		const media = window.matchMedia("(pointer: fine)");
		if (!media.matches) {
			document.body.classList.remove("pointer-active");
			return;
		}

		let targetX = window.innerWidth * 0.72;
		let targetY = window.innerHeight * 0.36;
		let currentX = targetX;
		let currentY = targetY;
		let rafId: number | null = null;

		const draw = () => {
			currentX += (targetX - currentX) * 0.18;
			currentY += (targetY - currentY) * 0.18;
			document.documentElement.style.setProperty(
				"--pointer-x",
				`${currentX}px`,
			);
			document.documentElement.style.setProperty(
				"--pointer-y",
				`${currentY}px`,
			);

			if (
				Math.abs(targetX - currentX) > 0.4 ||
				Math.abs(targetY - currentY) > 0.4
			) {
				rafId = window.requestAnimationFrame(draw);
			} else {
				rafId = null;
			}
		};

		const queueDraw = () => {
			if (rafId === null) {
				rafId = window.requestAnimationFrame(draw);
			}
		};

		const handlePointerMove = (event: PointerEvent) => {
			targetX = event.clientX;
			targetY = event.clientY;
			document.body.classList.add("pointer-active");
			queueDraw();
		};

		const handlePointerLeave = () => {
			document.body.classList.remove("pointer-active");
		};

		window.addEventListener("pointermove", handlePointerMove, {
			passive: true,
		});
		window.addEventListener("pointerleave", handlePointerLeave);

		return () => {
			if (rafId !== null) {
				window.cancelAnimationFrame(rafId);
			}
			document.body.classList.remove("pointer-active");
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerleave", handlePointerLeave);
		};
	}, []);

	return (
		<main className="stt-landing-page">
			<div className="bg-fx" aria-hidden="true">
				<div className="bg-vignette" />
				<div className="bg-grid" />
				<div className="bg-glow bg-glow--brand" />
				<div className="bg-glow bg-glow--cyan" />
				<div className="bg-pointer" />
			</div>

			<section className="landing" id="pageLanding">
				<header className="land-bar">
					<div className="brand">
						<span className="brand-mark" aria-hidden="true">
							<img
								src={brandLogoUrl ?? logoUrl}
								alt=""
								className="brand-logo"
								style={{ height: 24, width: "auto" }}
							/>
						</span>
						<span className="brand-name">
							{brandName || t("landing.brand")}
						</span>
					</div>
					<div className="land-actions">
						<LocaleSwitchMenu
							buttonClassName="icon-btn"
							menuClassName="land-lang-pop custom-select-pop stt-root-popover stt-choice__popover stt-choice__popover--content-aware"
							optionClassName="custom-select-option"
							checkClassName="custom-select-check"
							menuRole="listbox"
							icon={<Languages size={16} strokeWidth={1.9} />}
						/>
						{loggedIn ? (
							<div className="pop-anchor" ref={avatarPopoverRef}>
								<button
									className="land-user-avatar"
									type="button"
									aria-label={t("home.authenticatedUser")}
									aria-haspopup="menu"
									aria-expanded={avatarOpen}
									onClick={() => setAvatarOpen((current) => !current)}
								>
									{avatarLabel ?? t("common.selfAvatarFallback")}
								</button>
								{avatarOpen ? (
									<div className="pop right" role="menu">
										<button
											className="pop-item"
											type="button"
											role="menuitem"
											onClick={() => {
												setAvatarOpen(false);
												onOpenPlugin?.();
											}}
										>
											<span className="pop-item-main">
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
											onClick={() => {
												setAvatarOpen(false);
												onLogout?.();
											}}
										>
											<span className="pop-item-main">
												<LogOut size={14} />
												<span>{t("appShell.logout")}</span>
											</span>
										</button>
									</div>
								) : null}
							</div>
						) : (
							<button
								className="land-login-btn stt-button stt-button--white stt-button--md"
								type="button"
								onClick={onLogin}
							>
								<span className="stt-button__content">
									{t("landing.login")}
								</span>
							</button>
						)}
					</div>
				</header>

				<main className="land-main">
					<div className="land-copy">
						<div className="land-kicker">
							<span className="dot-live" />
							<span>{t("landing.kicker")}</span>
						</div>

						<h1 className="land-headline">{t("landing.headline")}</h1>

						<p className="land-sub">{t("landing.subtitle")}</p>

						<div className="land-cta">
							<button
								className="btn-primary"
								type="button"
								onClick={onPrimaryAction}
							>
								<span className="cta-label">{t("landing.cta")}</span>
								<span className="cta-icon" aria-hidden="true">
									<svg
										className="cta-icon-up"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										role="presentation"
									>
										<path
											d="M7 17 17 7M9 7h8v8"
											stroke="currentColor"
											strokeWidth="1.9"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
									<svg
										className="cta-icon-right"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										role="presentation"
									>
										<path
											d="M5 12h14M13 6l6 6-6 6"
											stroke="currentColor"
											strokeWidth="1.9"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								</span>
							</button>
						</div>
					</div>

					<div className="land-visual" aria-hidden="true">
						<div className="snip">
							<div className="snip-topbar">
								<div className="snip-brand">
									<span className="snip-mark" />
									<div>
										<strong>STT</strong>
										<span className="snip-room">A7Q3K9</span>
									</div>
								</div>
								<div className="snip-status">
									<span className="dot-live small" />
									<span className="snip-status-text">
										{t("landing.snippetStatus")}
									</span>
									<span className="snip-divider" />
									<span className="mono">09:42</span>
								</div>
							</div>

							<div className="snip-stage">
								<div className="snip-speaker">
									<div
										className="snip-avatar"
										style={
											{
												"--av": "linear-gradient(135deg, #e0e7ff, #c7d2fe)",
											} as React.CSSProperties
										}
									>
										T
									</div>
									<div className="snip-speaker-meta">
										<strong>Tony</strong>
										<div className="snip-speaker-sub">
											<span>
												{t("landing.snippetCurrentSpeakerWithLanguage")}
											</span>
											<div className="snip-wave">
												{waveKeys.map((key) => (
													<span key={key} />
												))}
											</div>
										</div>
									</div>
								</div>

								<div className="snip-original">
									{t("landing.snippetOriginalLine1")}
									<br />
									{t("landing.snippetOriginalLine2")}
								</div>
								<div className="snip-translation">
									{t("landing.snippetTranslation")}
								</div>
							</div>

							<div className="snip-side">
								<div className="snip-side-head">
									{t("landing.snippetParticipants")} · 8
								</div>
								<div className="snip-side-rows">
									<div className="snip-side-row active">
										<span />
										Tony
									</div>
									<div className="snip-side-row">
										<span />
										{t("landing.snippetParticipantYin")}
									</div>
									<div className="snip-side-row">
										<span />
										{t("landing.snippetParticipantSu")}
									</div>
									<div className="snip-side-row">
										<span />
										Dr. Lee
									</div>
								</div>
							</div>

							<div className="snip-dock">
								<span className="snip-dock-btn snip-dock-mic">
									<svg
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="currentColor"
										role="presentation"
									>
										<path d="M11.9998 1C14.7612 1 16.9998 3.23858 16.9998 6V10C16.9998 12.7614 14.7612 15 11.9998 15C9.23833 15 6.99976 12.7614 6.99976 10V6C6.99976 3.23858 9.23833 1 11.9998 1ZM3.05469 11H5.07065C5.55588 14.3923 8.47329 17 11.9998 17C15.5262 17 18.4436 14.3923 18.9289 11H20.9448C20.4837 15.1716 17.1714 18.4839 12.9998 18.9451V23H10.9998V18.9451C6.82814 18.4839 3.51584 15.1716 3.05469 11Z" />
									</svg>
								</span>
								<span className="snip-dock-btn snip-dock-cam">
									<svg
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="currentColor"
										role="presentation"
									>
										<path d="M17 9.2L22.2133 5.55071C22.4395 5.39235 22.7513 5.44737 22.9096 5.6736C22.9684 5.75764 23 5.85774 23 5.96033V18.0397C23 18.3158 22.7761 18.5397 22.5 18.5397C22.3974 18.5397 22.2973 18.5081 22.2133 18.4493L17 14.8V19C17 19.5523 16.5523 20 16 20H2C1.44772 20 1 19.5523 1 19V5C1 4.44772 1.44772 4 2 4H16C16.5523 4 17 4.44772 17 5V9.2ZM5 8V10H7V8H5Z" />
									</svg>
								</span>
								<span className="snip-dock-btn danger snip-dock-hangup">
									<svg
										width="14"
										height="14"
										viewBox="0 0 1024 1024"
										fill="currentColor"
										role="presentation"
									>
										<path d="M908.8 444.8c60.8 60.8 60.8 150.4 28.8 204.8-19.2 32-48 48-73.6 44.8-12.8-3.2-32-12.8-60.8-28.8-3.2-3.2-48-32-112-76.8v-102.4l-16-6.4c-99.2-41.6-224-38.4-329.6 0l-19.2 6.4v112c-22.4 12.8-67.2 38.4-76.8 44.8-38.4 19.2-73.6 41.6-89.6 41.6-19.2 3.2-38.4-3.2-54.4-19.2-6.4-6.4-9.6-12.8-16-19.2-28.8-44.8-35.2-118.4 9.6-179.2 64-83.2 236.8-144 406.4-140.8 179.2 3.2 316.8 41.6 396.8 108.8 0 3.2 3.2 6.4 6.4 9.6z" />
									</svg>
								</span>
							</div>
						</div>
					</div>
				</main>
			</section>
		</main>
	);
}
