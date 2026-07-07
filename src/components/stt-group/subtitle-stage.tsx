import { ChevronDown, Download, Languages } from "lucide-react";
import * as React from "react";
import { useDismissibleLayer } from "#/hooks/use-dismissible-layer";
import type { SubtitleRenderMode } from "#/lib/developer-mode/types";
import { useLocale, useT } from "#/lib/i18n";
import {
	getLanguageLabel,
	type LanguageCode,
	projectAppendHistoryEntries,
	projectSubtitleCurrentLine,
	projectSubtitleHistoryLines,
	type SttRoomMember,
	type SubtitleHistoryEntry,
	type SubtitleLine,
} from "#/lib/stt-group";

export type SubtitleDisplayMode = "both" | "source" | "target";

export type SubtitleStageProps = {
	roomJoined: boolean;
	sttRunning: boolean;
	sourceLanguages: LanguageCode[];
	targetLanguages: LanguageCode[];
	activeTargetLanguage: LanguageCode;
	subtitleRenderMode: SubtitleRenderMode;
	displayMode: SubtitleDisplayMode;
	lines: SubtitleLine[];
	members: SttRoomMember[];
	showVttExport: boolean;
	onDisplayModeChange: (mode: SubtitleDisplayMode) => void;
	onActiveTargetLanguageChange: (language: LanguageCode) => void;
	onExportSourceVtt: () => void;
	onExportTargetVtt: () => void;
};

const formatSubtitleTime = (value: number | undefined, locale: string) => {
	if (!value) {
		return "--:--";
	}
	return new Intl.DateTimeFormat(locale, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	}).format(value);
};

const railBars = Array.from({ length: 28 }, (_, index) => `rail-${index}`);
const waveBars = Array.from({ length: 7 }, (_, index) => `wave-${index}`);
const zhStageNameMap: Partial<Record<LanguageCode, string>> = {
	"en-US": "英语（美国）",
	"zh-CN": "中文（普通话）",
	"ja-JP": "日语（日本）",
	"de-DE": "德语（德国）",
};

const formatStageLanguageLabel = ({
	language,
	locale,
}: {
	language: LanguageCode;
	locale: string;
}) => {
	if (locale === "zh-CN") {
		return zhStageNameMap[language] ?? getLanguageLabel(language);
	}

	return language;
};

const formatStageLanguagePairLabel = ({
	sourceLanguages,
	targetLanguage,
	locale,
}: {
	sourceLanguages: LanguageCode[];
	targetLanguage: LanguageCode;
	locale: string;
}) => {
	const formattedSources = sourceLanguages.map((language) =>
		formatStageLanguageLabel({ language, locale }),
	);
	const formattedTarget = formatStageLanguageLabel({
		language: targetLanguage,
		locale,
	});

	return `${formattedSources.join(", ")}->${formattedTarget}`;
};

const resolveSpeaker = (
	line: SubtitleLine,
	members: SttRoomMember[],
	t: (key: string, params?: Record<string, string | number>) => string,
) => {
	const member = members.find(
		(item) =>
			item.rtcUid === line.speakerUid || item.userId === line.speakerUid,
	);
	const displayName =
		member?.displayName || t("stage.speakerFallback", { uid: line.speakerUid });
	const trimmed = displayName.trim();
	const avatarLabel = !trimmed
		? "ME"
		: !member
			? "U"
			: /^[A-Za-z]/.test(trimmed)
				? trimmed.slice(0, 2).toUpperCase()
				: trimmed.slice(0, 1);
	return {
		displayName,
		avatarLabel,
	};
};

function RenderSourceFragments({ line }: { line?: SubtitleLine }) {
	const t = useT();
	if (!line?.sourceFragments?.length) {
		return <>{line?.sourceText || t("stage.waitingCaptions")}</>;
	}

	return (
		<>
			{line.sourceFragments.map((fragment) => (
				<span
					key={fragment.fragmentKey}
					className={
						fragment.isFinal ? "utt-fragment-final" : "utt-fragment-tail"
					}
				>
					{fragment.text}
				</span>
			))}
		</>
	);
}

function RenderAlignedSourceFragments({ line }: { line?: SubtitleLine }) {
	const t = useT();
	if (!line?.sourceFragments?.length) {
		return <>{line?.sourceText || t("stage.waitingCaptions")}</>;
	}

	return (
		<>
			{line.sourceFragments.map((fragment) => (
				<span
					key={fragment.fragmentKey}
					className={
						fragment.isFinal ? "utt-fragment-final" : "utt-fragment-tail"
					}
				>
					{fragment.text}
				</span>
			))}
			{line.sourceFragments.at(-1)?.isFinal ? null : (
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
	);
}

function RenderTranslationFragments({
	line,
	language,
}: {
	line?: SubtitleLine;
	language: LanguageCode;
}) {
	const t = useT();
	const fragments = line?.targetTextFragments?.[language];
	if (!fragments?.length) {
		return null;
	}

	return (
		<>
			{fragments.map((fragment) => (
				<span
					key={fragment.fragmentKey}
					className={
						fragment.isFinal ? "utt-fragment-final" : "utt-fragment-tail"
					}
				>
					{fragment.text}
				</span>
			))}
			{fragments.at(-1)?.isFinal ? null : (
				<output
					className="dots-pending dots-pending-inline"
					aria-label={t("stage.waitingTranslationTail", {
						language: getLanguageLabel(language),
					})}
				>
					<span />
					<span />
					<span />
				</output>
			)}
		</>
	);
}

export function SubtitleStage({
	roomJoined,
	sourceLanguages,
	targetLanguages,
	activeTargetLanguage,
	subtitleRenderMode,
	displayMode,
	lines,
	members,
	showVttExport,
	onDisplayModeChange,
	onActiveTargetLanguageChange,
	onExportSourceVtt,
	onExportTargetVtt,
}: SubtitleStageProps) {
	const t = useT();
	const { locale } = useLocale();
	const flowRef = React.useRef<HTMLDivElement | null>(null);
	const seenHistoryIdsRef = React.useRef<Set<string>>(new Set());
	const currentLine = projectSubtitleCurrentLine(lines, subtitleRenderMode);
	const currentLineScrollKey = currentLine
		? `${currentLine.id}:${currentLine.updatedAt}`
		: `empty:${lines.length}`;
	const [showJumpButton, setShowJumpButton] = React.useState(false);
	const [displayModeMenuOpen, setDisplayModeMenuOpen] = React.useState(false);
	const [targetLanguageMenuOpen, setTargetLanguageMenuOpen] =
		React.useState(false);
	const dropdownRef = useDismissibleLayer({
		open: displayModeMenuOpen,
		onDismiss: () => setDisplayModeMenuOpen(false),
	});
	const targetLanguageDropdownRef = useDismissibleLayer({
		open: targetLanguageMenuOpen,
		onDismiss: () => setTargetLanguageMenuOpen(false),
	});
	const [enteringHistoryIds, setEnteringHistoryIds] = React.useState<string[]>(
		[],
	);
	const enteringTimeoutsRef = React.useRef<Map<string, number>>(new Map());
	const currentSpeaker = currentLine
		? resolveSpeaker(currentLine, members, t)
		: undefined;
	const prefersReducedMotion = React.useMemo(() => {
		if (typeof window === "undefined") {
			return false;
		}

		return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	}, []);
	const enteringHistoryIdSet = React.useMemo(
		() => new Set(enteringHistoryIds),
		[enteringHistoryIds],
	);
	const isAlignedMode = subtitleRenderMode === "aligned";
	const resolvedActiveTargetLanguage = targetLanguages.includes(
		activeTargetLanguage,
	)
		? activeTargetLanguage
		: (targetLanguages[0] ?? activeTargetLanguage);
	const currentFragmentKeys = new Set(
		currentLine?.sourceFragments?.map((fragment) => fragment.fragmentKey) ?? [],
	);
	const history = (
		isAlignedMode
			? projectSubtitleHistoryLines(lines, subtitleRenderMode).filter(
					(line) => !currentFragmentKeys.has(line.id),
				)
			: projectAppendHistoryEntries(
					lines,
					displayMode,
					resolvedActiveTargetLanguage,
				)
	).slice(-8);
	const showSource = displayMode === "both" || displayMode === "source";
	const showTarget = displayMode === "both" || displayMode === "target";
	const activeTargetLabel = formatStageLanguageLabel({
		language: resolvedActiveTargetLanguage,
		locale,
	});
	const activeLanguagePairLabel = formatStageLanguagePairLabel({
		sourceLanguages,
		targetLanguage: resolvedActiveTargetLanguage,
		locale,
	});
	const visibleTargetLanguages = showTarget
		? [resolvedActiveTargetLanguage]
		: [];
	const [emptyRailAccent, setEmptyRailAccent] = React.useState(false);

	React.useEffect(() => {
		if (roomJoined) {
			return;
		}

		let accentTimer = 0;
		let idleTimer = 0;
		const idleDuration = 2400;
		const accentDuration = 3000;

		const playCycle = () => {
			setEmptyRailAccent(false);
			accentTimer = window.setTimeout(() => {
				setEmptyRailAccent(true);
				idleTimer = window.setTimeout(playCycle, accentDuration);
			}, idleDuration);
		};

		playCycle();

		return () => {
			window.clearTimeout(accentTimer);
			window.clearTimeout(idleTimer);
			setEmptyRailAccent(false);
		};
	}, [roomJoined]);

	React.useLayoutEffect(() => {
		if (!currentLineScrollKey) {
			return;
		}
		const flow = flowRef.current;
		if (!flow) {
			return;
		}
		flow.scrollTop = flow.scrollHeight;
	}, [currentLineScrollKey]);

	React.useEffect(() => {
		const flow = flowRef.current;
		if (!flow) {
			return;
		}

		const updateJumpState = () => {
			const distanceFromBottom =
				flow.scrollHeight - flow.clientHeight - flow.scrollTop;
			setShowJumpButton(distanceFromBottom >= 24);
		};

		updateJumpState();
		flow.addEventListener("scroll", updateJumpState, { passive: true });
		return () => flow.removeEventListener("scroll", updateJumpState);
	}, []);

	React.useEffect(() => {
		if (prefersReducedMotion) {
			for (const line of history) {
				seenHistoryIdsRef.current.add(line.id);
			}
			return;
		}

		const nextEnteringIds: string[] = [];
		for (const line of history) {
			if (seenHistoryIdsRef.current.has(line.id)) {
				continue;
			}
			seenHistoryIdsRef.current.add(line.id);
			nextEnteringIds.push(line.id);
		}

		if (nextEnteringIds.length === 0) {
			return;
		}

		setEnteringHistoryIds((current) => [
			...current.filter((id) => !nextEnteringIds.includes(id)),
			...nextEnteringIds,
		]);
	}, [history, prefersReducedMotion]);

	React.useEffect(() => {
		if (prefersReducedMotion) {
			return;
		}

		for (const lineId of enteringHistoryIds) {
			if (enteringTimeoutsRef.current.has(lineId)) {
				continue;
			}

			const timeoutId = window.setTimeout(() => {
				enteringTimeoutsRef.current.delete(lineId);
				setEnteringHistoryIds((current) =>
					current.filter((id) => id !== lineId),
				);
			}, 260);
			enteringTimeoutsRef.current.set(lineId, timeoutId);
		}
	}, [enteringHistoryIds, prefersReducedMotion]);

	React.useEffect(
		() => () => {
			for (const timeoutId of enteringTimeoutsRef.current.values()) {
				window.clearTimeout(timeoutId);
			}
			enteringTimeoutsRef.current.clear();
		},
		[],
	);

	const handleHistoryItemAnimationEnd = React.useCallback((lineId: string) => {
		const timeoutId = enteringTimeoutsRef.current.get(lineId);
		if (timeoutId !== undefined) {
			window.clearTimeout(timeoutId);
			enteringTimeoutsRef.current.delete(lineId);
		}
		setEnteringHistoryIds((current) => current.filter((id) => id !== lineId));
	}, []);

	const scrollToCurrent = () => {
		const flow = flowRef.current;
		if (!flow) {
			return;
		}
		flow.scrollTo({
			top: flow.scrollHeight,
			behavior: "smooth",
		});
	};

	if (!roomJoined) {
		return (
			<div className="empty-stage" id="emptyStage">
				<div className="empty-stage-inner">
					<div className="land-kicker mini">
						<span className="dot-live muted" />
						<span>{t("stage.standby")}</span>
					</div>
					<h2 className="empty-headline">
						{t("stage.emptyHeadlineLine1")}
						<br />
						{t("stage.emptyHeadlineLine2")}
					</h2>
					<p className="empty-body">{t("stage.emptyBody")}</p>
					<div
						className={
							emptyRailAccent ? "empty-rail is-rail-accent" : "empty-rail"
						}
						aria-hidden="true"
					>
						{railBars.map((key, index) => (
							<span
								key={key}
								style={{ "--rail-i": index } as React.CSSProperties}
							/>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="session-stage" id="sessionStage">
			<div className="stage-toolbar">
				<div
					className="stage-chip ghost stage-language-chip"
					title={activeLanguagePairLabel}
				>
					<Languages size={13} />
				</div>
				<fieldset
					className="stage-dropdown-group"
					aria-label={t("stage.controlsLabel")}
				>
					<div
						ref={dropdownRef}
						className="stage-dropdown"
						data-open={displayModeMenuOpen}
					>
						<button
							className="stage-dropdown-trigger stt-arrow-button"
							type="button"
							aria-label={t("stage.sourceDisplay")}
							aria-haspopup="listbox"
							aria-expanded={displayModeMenuOpen}
							onClick={() => setDisplayModeMenuOpen((current) => !current)}
						>
							<span className="stt-arrow-button__label">
								{displayMode === "both"
									? t("stage.modeBoth")
									: displayMode === "source"
										? t("stage.modeSource")
										: t("stage.modeTarget")}
							</span>
							<ChevronDown size={12} aria-hidden="true" />
						</button>
						{displayModeMenuOpen ? (
							<div
								className="stage-dropdown-pop"
								role="listbox"
								aria-label={t("stage.sourceDisplayOptions")}
							>
								{(["both", "source", "target"] as const).map((mode) => (
									<button
										key={mode}
										type="button"
										data-on={displayMode === mode}
										onClick={() => {
											onDisplayModeChange(mode);
											setDisplayModeMenuOpen(false);
										}}
									>
										{mode === "both"
											? t("stage.modeBoth")
											: mode === "source"
												? t("stage.modeSource")
												: t("stage.modeTarget")}
									</button>
								))}
							</div>
						) : null}
					</div>
					<div
						ref={targetLanguageDropdownRef}
						className="stage-dropdown"
						data-open={targetLanguageMenuOpen}
					>
						<button
							className="stage-dropdown-trigger stt-arrow-button"
							type="button"
							aria-label={t("stage.targetLanguage")}
							aria-haspopup="listbox"
							aria-expanded={targetLanguageMenuOpen}
							disabled={targetLanguages.length <= 1}
							onClick={() => setTargetLanguageMenuOpen((current) => !current)}
						>
							<span className="stt-arrow-button__label">
								{t("stage.targetLanguage")}：{activeTargetLabel}
							</span>
							<ChevronDown size={12} aria-hidden="true" />
						</button>
						{targetLanguageMenuOpen ? (
							<div
								className="stage-dropdown-pop"
								role="listbox"
								aria-label={t("stage.targetLanguage")}
							>
								{targetLanguages.map((language) => (
									<button
										key={language}
										role="option"
										type="button"
										data-on={resolvedActiveTargetLanguage === language}
										aria-selected={resolvedActiveTargetLanguage === language}
										onClick={() => {
											onActiveTargetLanguageChange(language);
											setTargetLanguageMenuOpen(false);
										}}
									>
										{formatStageLanguagePairLabel({
											sourceLanguages,
											targetLanguage: language,
											locale,
										})}
									</button>
								))}
							</div>
						) : null}
					</div>
					{showVttExport ? (
						<>
							<button
								type="button"
								className="stage-chip"
								onClick={onExportSourceVtt}
							>
								<Download size={13} />
								{t("stage.sourceVtt")}
							</button>
							<button
								type="button"
								className="stage-chip"
								onClick={onExportTargetVtt}
							>
								<Download size={13} />
								{t("stage.targetVtt")}
							</button>
						</>
					) : null}
				</fieldset>
			</div>

			<div className="stage-body">
				<div ref={flowRef} className="subtitle-flow" id="subtitleFlow">
					<div className="history-track">
						{history.map((line) => (
							<HistoryItem
								key={line.id}
								line={line}
								members={members}
								targetLanguages={visibleTargetLanguages}
								showSource={showSource}
								showTarget={showTarget}
								locale={locale}
								isEntering={enteringHistoryIdSet.has(line.id)}
								onAnimationEnd={() => handleHistoryItemAnimationEnd(line.id)}
							/>
						))}
					</div>
				</div>
				<button
					className={
						showJumpButton
							? "subtitle-jump-bottom"
							: "subtitle-jump-bottom hidden"
					}
					type="button"
					aria-label={t("stage.backToCurrent")}
					onClick={scrollToCurrent}
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						aria-hidden="true"
					>
						<path
							d="M12 5v14M6 13l6 6 6-6"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</button>
				<CurrentUtterance
					currentLine={currentLine}
					currentSpeaker={currentSpeaker}
					isAlignedMode={isAlignedMode}
					showSource={showSource}
					showTarget={showTarget}
					targetLanguages={visibleTargetLanguages}
					locale={locale}
				/>
			</div>
		</div>
	);
}

function CurrentUtterance({
	currentLine,
	currentSpeaker,
	isAlignedMode,
	showSource,
	showTarget,
	targetLanguages,
	locale,
}: {
	currentLine?: SubtitleLine;
	currentSpeaker?: ReturnType<typeof resolveSpeaker>;
	isAlignedMode: boolean;
	showSource: boolean;
	showTarget: boolean;
	targetLanguages: LanguageCode[];
	locale: string;
}) {
	const t = useT();
	const sourceScrollRef = React.useRef<HTMLDivElement | null>(null);
	const targetScrollRef = React.useRef<HTMLDivElement | null>(null);

	React.useLayoutEffect(() => {
		for (const container of [
			sourceScrollRef.current,
			targetScrollRef.current,
		]) {
			if (!container) {
				continue;
			}
			container.scrollTop = container.scrollHeight;
		}
	});

	return (
		<article className="current-utterance" id="currentUtt">
			<header className="utt-speaker">
				<div className="utt-avatar-shell">
					<div className="utt-avatar-ring" aria-hidden="true" />
					<div className="utt-avatar">{currentSpeaker?.avatarLabel ?? "S"}</div>
				</div>
				<div className="utt-speaker-meta">
					<strong>
						{currentSpeaker?.displayName ?? t("stage.waitingSpeaker")}
					</strong>
					<div className="utt-speaker-sub">
						<div className="utt-wave" aria-hidden="true">
							{waveBars.map((key) => (
								<span key={key} />
							))}
						</div>
					</div>
				</div>
			</header>

			{currentLine ? null : (
				<div className="pre-receive">
					<div className="pulse-line" />
					<span className="pre-receive-text mono">{t("stage.receiving")}</span>
				</div>
			)}

			{showSource ? (
				<div
					ref={sourceScrollRef}
					className="utt-original-shell"
					aria-live="polite"
				>
					<h2 className="utt-original">
						{isAlignedMode ? (
							<RenderAlignedSourceFragments line={currentLine} />
						) : (
							<RenderSourceFragments line={currentLine} />
						)}
					</h2>
				</div>
			) : null}
			{showTarget ? (
				<div
					ref={targetScrollRef}
					className="utt-translation-shell"
					aria-live="polite"
				>
					{targetLanguages.map((language) => {
						const hasFragments = Boolean(
							currentLine?.targetTextFragments?.[language]?.length,
						);
						const text = currentLine?.targetTexts[language];

						return (
							<div className="utt-translation" key={language}>
								<span className="state">
									{formatStageLanguageLabel({ language, locale })}
								</span>{" "}
								{isAlignedMode ? (
									hasFragments ? (
										<RenderTranslationFragments
											line={currentLine}
											language={language}
										/>
									) : text ? (
										text
									) : (
										""
									)
								) : hasFragments ? (
									<RenderTranslationFragments
										line={currentLine}
										language={language}
									/>
								) : text ? (
									text
								) : (
									<output
										className="dots-pending"
										aria-label={t("stage.waitingTranslation", {
											language: formatStageLanguageLabel({
												language,
												locale,
											}),
										})}
									>
										<span />
										<span />
										<span />
									</output>
								)}
							</div>
						);
					})}
				</div>
			) : null}
		</article>
	);
}

function HistoryItem({
	line,
	members,
	targetLanguages,
	showSource,
	showTarget,
	locale,
	isEntering,
	onAnimationEnd,
}: {
	line: SubtitleHistoryEntry;
	members: SttRoomMember[];
	targetLanguages: LanguageCode[];
	showSource: boolean;
	showTarget: boolean;
	locale: string;
	isEntering: boolean;
	onAnimationEnd: () => void;
}) {
	const t = useT();
	const speaker = resolveSpeaker(line, members, t);

	return (
		<article
			className={
				isEntering ? "history-item history-item-entering" : "history-item"
			}
			onAnimationEnd={isEntering ? onAnimationEnd : undefined}
		>
			<header className="h-head">
				<div className="h-avatar">{speaker.avatarLabel}</div>
				<div className="h-name">{speaker.displayName}</div>
				<div className="h-ts">{formatSubtitleTime(line.updatedAt, locale)}</div>
			</header>
			{showSource && line.sourceText ? (
				<div className="h-original">
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
				</div>
			) : null}
			{showTarget
				? targetLanguages.map((language) =>
						line.targetTexts[language] ? (
							<div className="h-translation" key={language}>
								<span className="state">
									{formatStageLanguageLabel({ language, locale })}
								</span>{" "}
								{line.targetTextFragments?.[language]?.length
									? line.targetTextFragments[language]?.map((fragment) => (
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
									: line.targetTexts[language]}
							</div>
						) : null,
					)
				: null}
		</article>
	);
}
