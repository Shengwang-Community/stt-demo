import type { SubtitleRenderMode } from "#/lib/developer-mode/types";
import { useT } from "#/lib/i18n";
import {
	getLanguageLabel,
	projectAppendHistoryEntries,
	projectSubtitleCurrentLine,
	projectSubtitleHistoryLines,
	type SttRoomMember,
	type SubtitleLine,
} from "#/lib/stt-group";
import { LocaleSwitchMenu } from "./locale-switch-menu";

export type MobileViewerState =
	| "connecting"
	| "live"
	| "expired"
	| "ended"
	| "error";

export type MobileViewerProps = {
	state: MobileViewerState;
	errorMessage?: string;
	channelName: string;
	brandName?: string;
	brandLogoUrl?: string | null;
	sourceLanguages: string[];
	targetLanguages: string[];
	subtitleRenderMode: SubtitleRenderMode;
	lines: SubtitleLine[];
	members: SttRoomMember[];
	displayMode: "both" | "source" | "target";
	onDisplayModeChange: (mode: "both" | "source" | "target") => void;
	activeTargetLanguage: string;
	onActiveTargetLanguageChange: (language: string) => void;
};

export function MobileViewer({
	state,
	errorMessage,
	channelName,
	brandName,
	brandLogoUrl,
	sourceLanguages,
	targetLanguages,
	subtitleRenderMode,
	lines,
	members,
	displayMode,
	onDisplayModeChange,
	activeTargetLanguage,
	onActiveTargetLanguageChange,
}: MobileViewerProps) {
	const t = useT();
	const currentLine = projectSubtitleCurrentLine(lines, subtitleRenderMode);
	const showSource = displayMode === "both" || displayMode === "source";
	const showTarget = displayMode === "both" || displayMode === "target";
	const isAlignedMode = subtitleRenderMode === "aligned";
	const resolvedActiveTargetLanguage = targetLanguages.includes(
		activeTargetLanguage,
	)
		? activeTargetLanguage
		: (targetLanguages[0] ?? activeTargetLanguage);
	const visibleTargetLanguages = resolvedActiveTargetLanguage
		? [resolvedActiveTargetLanguage]
		: [];
	const history = (
		subtitleRenderMode === "aligned"
			? projectSubtitleHistoryLines(lines, subtitleRenderMode)
			: projectAppendHistoryEntries(
					lines,
					displayMode,
					resolvedActiveTargetLanguage,
				)
	)
		.slice(-12)
		.reverse();
	const sourceLabel = sourceLanguages.map(getLanguageLabel).join(", ");
	const targetLabel = targetLanguages.map(getLanguageLabel).join(", ");
	const resolveSpeakerName = (speakerUid: string) => {
		const member = members.find(
			(item) => item.rtcUid === speakerUid || item.userId === speakerUid,
		);
		return (
			member?.displayName || `${t("common.selfAvatarFallback")} ${speakerUid}`
		);
	};

	if (state === "connecting") {
		return (
			<main className="mobile-viewer-page mobile-viewer-page--status">
				<div className="mobile-viewer-status">
					<p>{t("mobile.kicker")}</p>
					<strong>{t("mobile.connecting")}</strong>
				</div>
			</main>
		);
	}

	if (state === "expired") {
		return (
			<main className="mobile-viewer-page mobile-viewer-page--status">
				<div className="mobile-viewer-status">
					<p>{t("mobile.kicker")}</p>
					<strong>{t("mobile.expired")}</strong>
				</div>
			</main>
		);
	}

	if (state === "ended") {
		return (
			<main className="mobile-viewer-page mobile-viewer-page--status">
				<div className="mobile-viewer-status">
					<p>{t("mobile.kicker")}</p>
					<strong>{t("mobile.ended")}</strong>
				</div>
			</main>
		);
	}

	if (state === "error") {
		return (
			<main className="mobile-viewer-page mobile-viewer-page--status">
				<div className="mobile-viewer-status">
					<p>{t("mobile.kicker")}</p>
					<strong>
						{errorMessage ?? t("errors.mobileViewerConnectFailed")}
					</strong>
				</div>
			</main>
		);
	}

	return (
		<main className="mobile-viewer-page">
			<div className="mobile-viewer-sticky-top">
				<header className="mobile-viewer-header">
					<div className="mobile-viewer-header-row">
						<div className="mobile-viewer-brand">
							{brandLogoUrl ? (
								<img
									src={brandLogoUrl}
									alt=""
									className="mobile-viewer-brand-logo"
								/>
							) : null}
							<strong>{brandName || t("landing.brand")}</strong>
						</div>
						<LocaleSwitchMenu
							buttonClassName="icon-btn mobile-viewer-locale-btn"
							menuClassName="pop right mobile-viewer-locale-pop"
						/>
					</div>
					<div className="mobile-viewer-meta">
						<p className="mobile-viewer-kicker">{t("mobile.kicker")}</p>
						<div className="mobile-viewer-room">
							{t("mobile.roomLabel")} · {channelName}
						</div>
					</div>
					<div className="mobile-viewer-languages">
						{sourceLabel} → {targetLabel}
					</div>
				</header>

				<fieldset
					className="mobile-viewer-display-modes"
					aria-label={t("mobile.displayModeLabel")}
				>
					<button
						type="button"
						aria-pressed={displayMode === "both"}
						onClick={() => onDisplayModeChange("both")}
					>
						{t("mobile.displayModeBoth")}
					</button>
					<button
						type="button"
						aria-pressed={displayMode === "source"}
						onClick={() => onDisplayModeChange("source")}
					>
						{t("mobile.displayModeSource")}
					</button>
					<button
						type="button"
						aria-pressed={displayMode === "target"}
						onClick={() => onDisplayModeChange("target")}
					>
						{t("mobile.displayModeTarget")}
					</button>
				</fieldset>

				{targetLanguages.length > 1 ? (
					<fieldset
						className="mobile-viewer-target-languages"
						aria-label={t("stage.targetLanguage")}
					>
						{targetLanguages.map((language) => (
							<button
								key={language}
								type="button"
								aria-pressed={resolvedActiveTargetLanguage === language}
								onClick={() => onActiveTargetLanguageChange(language)}
							>
								{getLanguageLabel(language)}
							</button>
						))}
					</fieldset>
				) : null}

				<section className="mobile-viewer-current">
					{currentLine ? (
						<p className="mobile-viewer-speaker">
							{resolveSpeakerName(currentLine.speakerUid)}
						</p>
					) : null}
					{showSource ? (
						<h1 className="mobile-viewer-source">
							{currentLine?.sourceFragments?.length && isAlignedMode ? (
								<>
									{currentLine.sourceFragments.map((fragment) => (
										<span
											key={fragment.fragmentKey}
											className={
												fragment.isFinal
													? "utt-fragment-final"
													: "utt-fragment-tail"
											}
										>
											{fragment.text}
										</span>
									))}
									{currentLine.sourceFragments.at(-1)?.isFinal ? null : (
										<output
											className="dots-pending dots-pending-inline"
											aria-label={t("stage.waitingSourceTail")}
										>
											<span />
											<span />
											<span />
										</output>
									)}
								</>
							) : currentLine?.sourceText ? (
								currentLine.sourceText
							) : (
								t("mobile.waitingSource")
							)}
						</h1>
					) : null}
					{showTarget ? (
						<div className="mobile-viewer-target">
							{visibleTargetLanguages.map((language) => (
								<p key={language}>
									{isAlignedMode &&
									currentLine?.targetTextFragments?.[language]?.length ? (
										<>
											{currentLine.targetTextFragments[language]?.map(
												(fragment) => (
													<span
														key={fragment.fragmentKey}
														className={
															fragment.isFinal
																? "utt-fragment-final"
																: "utt-fragment-tail"
														}
													>
														{fragment.text}
													</span>
												),
											)}
											{currentLine.targetTextFragments[language]?.at(-1)
												?.isFinal ? null : (
												<output
													className="dots-pending dots-pending-inline"
													aria-label={t("stage.waitingTranslation", {
														language: getLanguageLabel(language),
													})}
												>
													<span />
													<span />
													<span />
												</output>
											)}
										</>
									) : isAlignedMode ? (
										(currentLine?.targetTexts[language] ?? "")
									) : (
										(currentLine?.targetTexts[language] ??
										t("mobile.waitingTarget"))
									)}
								</p>
							))}
						</div>
					) : null}
				</section>
			</div>

			<section className="mobile-viewer-history">
				{history.map((line) => (
					<article key={line.id} className="mobile-viewer-history-item">
						<p className="mobile-viewer-history-speaker">
							{resolveSpeakerName(line.speakerUid)}
						</p>
						{showSource && line.sourceText ? (
							<p>
								{line.sourceFragments?.length
									? line.sourceFragments.map((fragment) => (
											<span
												key={fragment.fragmentKey}
												className={
													fragment.isFinal
														? "utt-fragment-final"
														: "utt-fragment-tail"
												}
											>
												{fragment.text}
											</span>
										))
									: line.sourceText}
							</p>
						) : null}
						{showTarget
							? visibleTargetLanguages.map((language) => {
									const text = line.targetTexts[language];
									return text ? (
										<p key={language}>
											{line.targetTextFragments?.[language]?.length
												? line.targetTextFragments[language]?.map(
														(fragment) => (
															<span
																key={fragment.fragmentKey}
																className={
																	fragment.isFinal
																		? "utt-fragment-final"
																		: "utt-fragment-tail"
																}
															>
																{fragment.text}
															</span>
														),
													)
												: text}
										</p>
									) : null;
								})
							: null}
					</article>
				))}
			</section>
		</main>
	);
}
