import {
	ArrowRight,
	Camera,
	CameraOff,
	Check,
	ChevronDown,
	Copy,
	Mic,
	MicOff,
	X,
} from "lucide-react";
import * as React from "react";
import { useDismissibleLayer } from "#/hooks/use-dismissible-layer";
import { useLocale, useT } from "#/lib/i18n";
import {
	getLanguageLabel,
	type LanguageCode,
	type LanguageOption,
	MAX_SOURCE_LANGUAGES,
	MAX_TARGET_LANGUAGES,
	type RecognitionMode,
	SUPPORTED_LANGUAGES,
} from "#/lib/stt-group";

export type PrestartRecognitionMode = RecognitionMode | "auto";

export type PrestartPanelProps = {
	mode: "create" | "join";
	channelName: string;
	nickname: string;
	recognitionMode: PrestartRecognitionMode;
	sourceLanguages: LanguageCode[];
	targetLanguages: LanguageCode[];
	microphoneDevices: Array<{ deviceId: string; label: string }>;
	selectedMicrophoneDeviceId: string;
	cameraDevices: Array<{ deviceId: string; label: string }>;
	selectedCameraDeviceId: string;
	subtitleDisplayMode: "both" | "source" | "target";
	busy: boolean;
	canStart: boolean;
	microphoneMuted: boolean;
	cameraEnabled: boolean;
	microphoneReady?: boolean;
	onChannelNameChange: (value: string) => void;
	onNicknameChange: (value: string) => void;
	onRecognitionModeChange: (value: PrestartRecognitionMode) => void;
	onSourceLanguagesChange: (value: LanguageCode[]) => void;
	onTargetLanguagesChange: (value: LanguageCode[]) => void;
	onSubtitleDisplayModeChange: (value: "both" | "source" | "target") => void;
	onSelectMicrophoneDevice: (deviceId: string) => void;
	onSelectCameraDevice: (deviceId: string) => void;
	onToggleMicrophone: () => void;
	onToggleCamera: () => void;
	onStart: () => void;
	onRandomChannelName: () => void;
	onModeChange: (mode: "create" | "join") => void;
	onOpenAdvanced: () => void;
	localVideoRef: (element: HTMLDivElement | null) => void;
};

type SharedMenuState = {
	activeMenu: string | null;
	setActiveMenu: React.Dispatch<React.SetStateAction<string | null>>;
};

const avatarFallback = (value: string) => {
	const trimmed = value.trim();
	if (!trimmed) {
		return { label: "ME", numeric: false };
	}
	if (/^[A-Za-z]/.test(trimmed)) {
		return { label: trimmed.slice(0, 2).toUpperCase(), numeric: false };
	}
	if (/^\d/.test(trimmed)) {
		return { label: trimmed.slice(0, 2), numeric: true };
	}
	return { label: trimmed.slice(0, 1), numeric: false };
};

const filterLanguages = (query: string, options: readonly LanguageOption[]) => {
	const normalizedQuery = query.trim().toLowerCase();
	if (!normalizedQuery) {
		return options;
	}
	return options.filter(
		(option) =>
			option.label.toLowerCase().includes(normalizedQuery) ||
			option.fullLabel.toLowerCase().includes(normalizedQuery) ||
			option.value.toLowerCase().includes(normalizedQuery),
	);
};

const chineseLanguageNameMap: Partial<Record<LanguageCode, string>> = {
	"zh-CN": "中文（中国大陆）",
	"en-US": "英语（美国）",
	"ja-JP": "日语（日本）",
	"de-DE": "德语（德国）",
};

const designPrestartLanguagePreset: readonly LanguageCode[] = [
	"zh-CN",
	"en-US",
	"ja-JP",
	"de-DE",
];

const formatLanguageOptionLabel = ({
	option,
	locale,
}: {
	option: LanguageOption;
	locale: string;
}) => {
	if (locale === "zh-CN") {
		return `${option.label}-${chineseLanguageNameMap[option.value] ?? option.label}-${option.value}`;
	}

	return `${option.label}-${option.value}`;
};

function SearchableMultiLanguageSelect({
	label,
	values,
	disabled,
	max,
	selectionMode = "multiple",
	placeholder,
	searchPlaceholder,
	visibleValues,
	excludedValues = [],
	allowClear = false,
	plainSelectedWhenSingle = false,
	onChange,
	menuState,
	menuId,
}: {
	label: string;
	values: LanguageCode[];
	disabled: boolean;
	max: number;
	selectionMode?: "single" | "multiple";
	placeholder?: string;
	searchPlaceholder?: string;
	visibleValues?: readonly LanguageCode[];
	excludedValues?: LanguageCode[];
	allowClear?: boolean;
	plainSelectedWhenSingle?: boolean;
	onChange: (values: LanguageCode[]) => void;
	menuState?: SharedMenuState;
	menuId?: string;
}) {
	const t = useT();
	const { locale } = useLocale();
	const [open, setOpen] = React.useState(false);
	const [query, setQuery] = React.useState("");
	const searchInputRef = React.useRef<HTMLInputElement>(null);
	const resolvedMenuId = menuId ?? label;
	const resolvedOpen = menuState
		? menuState.activeMenu === resolvedMenuId
		: open;
	const popoverRef = useDismissibleLayer({
		open: resolvedOpen,
		onDismiss: () => {
			if (menuState) {
				menuState.setActiveMenu(null);
				return;
			}
			setOpen(false);
		},
	});
	const excluded = new Set(excludedValues);
	const selected = SUPPORTED_LANGUAGES.filter((option) =>
		values.includes(option.value),
	);
	const shouldUseVisibleOptions = visibleValues?.length && !query.trim();
	const baseOptions = shouldUseVisibleOptions
		? visibleValues
				.map((value) =>
					SUPPORTED_LANGUAGES.find((option) => option.value === value),
				)
				.filter((option): option is LanguageOption => Boolean(option))
		: SUPPORTED_LANGUAGES;
	const options = filterLanguages(query, baseOptions).filter(
		(option) => !excluded.has(option.value),
	);
	const resolvedPlaceholder =
		placeholder ?? t("prestart.searchAndSelectMax", { max });
	const usePlainSingleSelected =
		plainSelectedWhenSingle && selected.length === 1;
	const closeMenu = () => {
		setQuery("");
		if (menuState) {
			menuState.setActiveMenu(null);
			return;
		}
		setOpen(false);
	};

	React.useEffect(() => {
		if (!resolvedOpen) {
			return;
		}
		const frame = requestAnimationFrame(() => {
			searchInputRef.current?.focus();
		});
		return () => cancelAnimationFrame(frame);
	}, [resolvedOpen]);

	const toggleValue = (value: LanguageCode) => {
		if (selectionMode === "single") {
			if (allowClear && values.includes(value)) {
				onChange([]);
				closeMenu();
				return;
			}
			onChange([value]);
			closeMenu();
			return;
		}
		if (values.includes(value)) {
			onChange(values.filter((current) => current !== value));
			return;
		}
		if (values.length < max) {
			onChange([...values, value]);
		}
	};

	return (
		<div
			className="multi-language-shell stt-choice stt-choice--multi stt-multi-select stt-searchable-multi-select stt-multi-language-picker"
			data-open={resolvedOpen}
			data-menu-id={resolvedMenuId}
		>
			{/* biome-ignore lint/a11y/useSemanticElements: The trigger contains removable language-chip buttons, so a native button would create nested buttons. */}
			<div
				className="multi-language-trigger-row stt-choice__trigger stt-multi-select__trigger stt-searchable-multi-select__trigger"
				role="button"
				tabIndex={disabled ? -1 : 0}
				aria-label={label}
				aria-expanded={resolvedOpen}
				aria-disabled={disabled}
				onClick={() => {
					if (disabled) {
						return;
					}
					if (menuState) {
						menuState.setActiveMenu((current) =>
							current === resolvedMenuId ? null : resolvedMenuId,
						);
						return;
					}
					setOpen((current) => !current);
				}}
				onKeyDown={(event) => {
					if (disabled) {
						return;
					}
					if (event.key !== "Enter" && event.key !== " ") {
						return;
					}
					event.preventDefault();
					if (menuState) {
						menuState.setActiveMenu((current) =>
							current === resolvedMenuId ? null : resolvedMenuId,
						);
						return;
					}
					setOpen((current) => !current);
				}}
			>
				<div className="multi-language-selected stt-multi-select__selected">
					{selected.length === 0 ? (
						<span className="multi-language-placeholder stt-multi-select__placeholder">
							{resolvedPlaceholder}
						</span>
					) : usePlainSingleSelected ? (
						selected.map((option) => (
							<span className="multi-language-plain-value" key={option.value}>
								<span className="stt-multi-select__plain-label">
									{formatLanguageOptionLabel({ option, locale })}
								</span>
								{selectionMode === "multiple" || allowClear ? (
									<button
										type="button"
										aria-label={t("prestart.removeSelectedLanguage", {
											label: option.label,
										})}
										disabled={disabled}
										onClick={(event) => {
											event.stopPropagation();
											toggleValue(option.value);
										}}
									>
										<X size={13} aria-hidden="true" />
									</button>
								) : null}
							</span>
						))
					) : (
						selected.map((option) => (
							<span
								className="multi-language-tag stt-multi-select__tag"
								key={option.value}
							>
								<span className="stt-multi-select__tag-label">
									{formatLanguageOptionLabel({ option, locale })}
								</span>
								{selectionMode === "multiple" || allowClear ? (
									<button
										type="button"
										aria-label={t("prestart.removeSelectedLanguage", {
											label: option.label,
										})}
										disabled={disabled}
										onClick={(event) => {
											event.stopPropagation();
											toggleValue(option.value);
										}}
									>
										<X size={12} aria-hidden="true" />
									</button>
								) : null}
							</span>
						))
					)}
				</div>
				<span className="multi-language-trigger" aria-hidden="true">
					<ChevronDown size={14} />
				</span>
			</div>
			{resolvedOpen ? (
				<div
					ref={popoverRef}
					className="multi-language-popup stt-choice__popover stt-choice__popover--content-aware stt-searchable-multi-select__popover"
					role="listbox"
					aria-label={label}
					aria-multiselectable={
						selectionMode === "multiple" ? "true" : undefined
					}
				>
					<label className="multi-language-search-wrap">
						<input
							aria-label={label}
							className="multi-language-search stt-input"
							ref={searchInputRef}
							value={query}
							disabled={disabled}
							placeholder={
								searchPlaceholder ?? t("prestart.searchTargetLanguage")
							}
							onChange={(event) => setQuery(event.target.value)}
						/>
					</label>
					<div className="multi-language-popup-inner">
						{options.slice(0, 40).map((option) => {
							const checked = values.includes(option.value);
							const capped =
								selectionMode === "multiple" &&
								!checked &&
								values.length >= max;
							const popupLabel = formatLanguageOptionLabel({ option, locale });
							return (
								<button
									key={option.value}
									className={
										checked
											? "multi-language-option stt-choice__option stt-multi-select__option stt-searchable-multi-select__option active is-selected"
											: "multi-language-option stt-choice__option stt-multi-select__option stt-searchable-multi-select__option"
									}
									type="button"
									role="option"
									aria-selected={checked}
									disabled={disabled || capped}
									onClick={() => toggleValue(option.value)}
								>
									<span>{popupLabel}</span>
									<span className="multi-language-check">
										{checked ? <Check size={13} /> : null}
									</span>
								</button>
							);
						})}
						{options.length > 40 ? (
							<div className="multi-language-empty">
								{t("prestart.typeMoreToNarrow")}
							</div>
						) : null}
						{options.length === 0 ? (
							<div className="multi-language-empty">
								{t("prestart.noMatchingLanguage")}
							</div>
						) : null}
					</div>
				</div>
			) : null}
		</div>
	);
}

function SubtitleDisplaySelect({
	value,
	disabled,
	onChange,
	menuState,
	menuId,
}: {
	value: "both" | "source" | "target";
	disabled: boolean;
	onChange: (value: "both" | "source" | "target") => void;
	menuState?: SharedMenuState;
	menuId?: string;
}) {
	const t = useT();
	const [open, setOpen] = React.useState(false);
	const resolvedMenuId = menuId ?? "subtitle-display";
	const resolvedOpen = menuState
		? menuState.activeMenu === resolvedMenuId
		: open;
	const popoverRef = useDismissibleLayer({
		open: resolvedOpen,
		onDismiss: () => {
			if (menuState) {
				menuState.setActiveMenu(null);
				return;
			}
			setOpen(false);
		},
	});
	const options = [
		{ value: "both" as const, label: t("prestart.subtitleDisplayBoth") },
		{ value: "source" as const, label: t("prestart.subtitleDisplaySource") },
		{ value: "target" as const, label: t("prestart.subtitleDisplayTarget") },
	];
	const selected =
		options.find((option) => option.value === value) ?? options[0];

	return (
		<div
			className="custom-select stt-subtitle-display-select"
			data-open={resolvedOpen}
		>
			<button
				className="custom-select-trigger multi-language-trigger-row stt-choice__trigger"
				type="button"
				aria-label={t("prestart.subtitleDisplay")}
				aria-haspopup="listbox"
				aria-expanded={resolvedOpen}
				disabled={disabled}
				onClick={() => {
					if (disabled) {
						return;
					}
					if (menuState) {
						menuState.setActiveMenu((current) =>
							current === resolvedMenuId ? null : resolvedMenuId,
						);
						return;
					}
					setOpen((current) => !current);
				}}
			>
				<span className="custom-select-value stt-choice__value">
					{selected.label}
				</span>
				<span
					className="custom-select-chevron stt-choice__chevrons"
					aria-hidden="true"
				>
					<span />
					<span />
				</span>
			</button>
			{resolvedOpen ? (
				<div
					ref={popoverRef}
					className="custom-select-pop stt-root-popover stt-choice__popover stt-choice__popover--match-trigger"
					role="listbox"
					aria-label={t("prestart.subtitleDisplay")}
				>
					{options.map((option) => (
						<button
							key={option.value}
							type="button"
							role="option"
							aria-selected={option.value === value}
							className={
								option.value === value
									? "custom-select-option selected"
									: "custom-select-option"
							}
							onClick={() => {
								onChange(option.value);
								if (menuState) {
									menuState.setActiveMenu(null);
									return;
								}
								setOpen(false);
							}}
						>
							<span>{option.label}</span>
							<span className="custom-select-check">
								{option.value === value ? <Check size={13} /> : null}
							</span>
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}

export function PrestartPanel({
	mode,
	channelName,
	nickname,
	recognitionMode,
	sourceLanguages,
	targetLanguages,
	microphoneDevices,
	selectedMicrophoneDeviceId,
	cameraDevices,
	selectedCameraDeviceId,
	subtitleDisplayMode,
	busy,
	canStart,
	microphoneMuted,
	cameraEnabled,
	microphoneReady,
	onChannelNameChange,
	onNicknameChange,
	onRecognitionModeChange,
	onSourceLanguagesChange,
	onTargetLanguagesChange,
	onSubtitleDisplayModeChange,
	onSelectMicrophoneDevice,
	onSelectCameraDevice,
	onToggleMicrophone,
	onToggleCamera,
	onStart,
	onRandomChannelName,
	onModeChange,
	onOpenAdvanced,
	localVideoRef,
}: PrestartPanelProps) {
	const t = useT();
	const panelScrollRef = React.useRef<HTMLDivElement | null>(null);
	const [activeMenu, setActiveMenu] = React.useState<string | null>(null);
	const nicknameAvatar = avatarFallback(nickname);
	const selectedSource = sourceLanguages[0];
	const effectiveRecognitionMode =
		recognitionMode === "auto" ? "single" : recognitionMode;
	const singleSourceTargetExclusions =
		effectiveRecognitionMode === "single" &&
		recognitionMode !== "auto" &&
		selectedSource
			? [selectedSource]
			: [];
	const microphoneDeviceOptions = microphoneDevices.length
		? microphoneDevices
		: [{ deviceId: "", label: t("prestart.microphoneDevice") }];
	const cameraDeviceOptions = cameraDevices.length
		? cameraDevices
		: [{ deviceId: "", label: t("prestart.cameraDevice") }];
	const microphoneReadyDisplay = microphoneReady ?? !microphoneMuted;
	const cameraPreviewDisplay = cameraEnabled;

	React.useEffect(() => {
		if (mode !== "create" && mode !== "join") {
			return;
		}
		if (panelScrollRef.current) {
			panelScrollRef.current.scrollTop = 0;
		}
	}, [mode]);

	React.useEffect(() => {
		if (mode !== "create" && mode !== "join") {
			return;
		}
		setActiveMenu(null);
	}, [mode]);

	return (
		<section
			aria-label={t("prestart.prepareLabel")}
			className="prestart glass stt-prestart-panel"
			data-migrated-component="PrestartPanel"
		>
			<div
				className="prestart-tabs stt-tabs stt-tabs--fill"
				role="tablist"
				aria-label={t("prestart.startMode")}
				data-migrated-component="Tabs"
				style={
					{
						"--stt-tabs-count": 2,
						"--stt-tabs-indicator-shift":
							mode === "join"
								? "calc(100% + var(--stt-component-tabs-gap))"
								: "calc(0% + (var(--stt-component-tabs-gap) * 0))",
					} as React.CSSProperties
				}
			>
				<button
					type="button"
					className={mode === "create" ? "is-active" : ""}
					role="tab"
					aria-selected={mode === "create"}
					onClick={() => onModeChange("create")}
				>
					<span>{t("prestart.createRoom")}</span>
				</button>
				<button
					type="button"
					className={mode === "join" ? "is-active" : ""}
					role="tab"
					aria-selected={mode === "join"}
					onClick={() => onModeChange("join")}
				>
					<span>{t("prestart.joinRoom")}</span>
				</button>
			</div>
			<div
				ref={panelScrollRef}
				className="panel-scroll stt-prestart-panel__body"
			>
				<div
					className="group stt-prestart-group"
					data-migrated-component="PrestartGroup"
				>
					<div className="group-head stt-prestart-group__head">
						<strong className="stt-prestart-group__title">
							{t("prestart.roomInfo")}
						</strong>
					</div>
					<div className="field stt-field stt-field-composition stt-field-stack stt-prestart-room-field">
						<label
							className="stt-field__label stt-field-composition__label"
							htmlFor="roomIdInput"
						>
							{t("prestart.roomNumber")}
						</label>
						<div
							className={
								mode === "join"
									? "field-inline field-inline--single stt-field-composition__control stt-field-stack__control"
									: "field-inline stt-field-composition__control stt-field-stack__control"
							}
						>
							<div
								className={
									mode === "join"
										? "room-input-shell room-input-shell--plain"
										: "room-input-shell"
								}
							>
								<input
									id="roomIdInput"
									className="text-input mono stt-input room-input-shell__input"
									value={channelName}
									placeholder={
										mode === "join"
											? t("prestart.roomNumberPlaceholder")
											: undefined
									}
									disabled={busy}
									onChange={(event) => onChannelNameChange(event.target.value)}
								/>
								{mode === "join" ? null : (
									<button
										type="button"
										className="room-input-shell__copy"
										aria-label={t("prestart.copyRoomNumber")}
										onClick={() =>
											void navigator.clipboard?.writeText(channelName)
										}
									>
										<span className="room-copy-btn__icon" aria-hidden="true">
											<Copy size={14} />
										</span>
									</button>
								)}
							</div>
							{mode === "join" ? null : (
								<button
									className="mini-btn stt-button stt-button--tertiary stt-button--sm"
									type="button"
									disabled={busy}
									onClick={onRandomChannelName}
								>
									<span className="stt-button__content">
										{t("prestart.random")}
									</span>
								</button>
							)}
						</div>
					</div>
					<div
						className="field stt-field stt-field-composition stt-field-stack stt-prestart-nickname"
						data-migrated-component="PrestartNicknameField"
					>
						<label
							className="stt-field__label stt-field-composition__label"
							htmlFor="nicknameInput"
						>
							{t("prestart.nickname")}
						</label>
						<div className="user-row stt-field-composition__control stt-field-stack__control stt-prestart-nickname__control">
							<div
								className="u-avatar stt-prestart-nickname__avatar"
								data-numeric={nicknameAvatar.numeric}
								aria-hidden="true"
							>
								<span>{nicknameAvatar.label}</span>
							</div>
							<input
								id="nicknameInput"
								className="text-input stt-input stt-prestart-nickname__input"
								maxLength={18}
								value={nickname}
								placeholder={t("prestart.nicknamePlaceholder")}
								disabled={busy}
								onChange={(event) => onNicknameChange(event.target.value)}
							/>
						</div>
					</div>
				</div>

				{mode === "create" ? (
					<div
						className="group stt-prestart-group language-settings-group"
						data-migrated-component="PrestartGroup"
					>
						<div className="group-head stt-prestart-group__head">
							<strong className="stt-prestart-group__title">
								{t("prestart.languageSettings")}
							</strong>
						</div>
						<div className="prestart-language-card prestart-language-card--recognition">
							{/* biome-ignore lint/a11y/useSemanticElements: This wrapper follows the existing field layout; replacing it with fieldset changes the visual box model. */}
							<div
								className="field stt-field stt-language-mode-pills"
								data-migrated-component="LanguageModePills"
								role="group"
								aria-label={t("prestart.recognitionMode")}
							>
								<span className="stt-field__label">
									{t("prestart.recognitionMode")}
								</span>
								<div className="radio-row stt-language-mode-pills__items">
									<button
										className={
											effectiveRecognitionMode === "single" &&
											recognitionMode !== "auto"
												? "radio-pill stt-language-mode-pills__button active"
												: "radio-pill stt-language-mode-pills__button"
										}
										type="button"
										aria-pressed={
											effectiveRecognitionMode === "single" &&
											recognitionMode !== "auto"
										}
										disabled={busy}
										onClick={() => onRecognitionModeChange("single")}
									>
										{t("prestart.singleRecognition")}
									</button>
									<button
										className={
											effectiveRecognitionMode === "multi"
												? "radio-pill stt-language-mode-pills__button active"
												: "radio-pill stt-language-mode-pills__button"
										}
										type="button"
										aria-pressed={effectiveRecognitionMode === "multi"}
										disabled={busy}
										onClick={() => onRecognitionModeChange("multi")}
									>
										{t("prestart.multiRecognition")}
									</button>
									<button
										className={
											recognitionMode === "auto"
												? "radio-pill stt-language-mode-pills__button active"
												: "radio-pill stt-language-mode-pills__button"
										}
										type="button"
										aria-pressed={recognitionMode === "auto"}
										disabled={busy}
										onClick={() => onRecognitionModeChange("auto")}
									>
										{t("prestart.autoRecognition")}
									</button>
								</div>
							</div>
							{recognitionMode === "auto" ? null : (
								<div className="field stt-field stt-field-composition stt-field-stack">
									<div className="stt-field__label stt-field-composition__label">
										{t("prestart.sourceLanguage")}
									</div>
									<div className="stt-field-composition__control stt-field-stack__control">
										{effectiveRecognitionMode === "single" ? (
											<SearchableMultiLanguageSelect
												label={t("prestart.sourceLanguage")}
												values={selectedSource ? [selectedSource] : []}
												disabled={busy}
												max={1}
												selectionMode="single"
												allowClear
												plainSelectedWhenSingle
												placeholder={t("prestart.selectSourceLanguage")}
												searchPlaceholder={t("prestart.searchSourceLanguage")}
												visibleValues={designPrestartLanguagePreset}
												onChange={(languages) => {
													const language = languages[0];
													onSourceLanguagesChange(language ? [language] : []);
													if (language && targetLanguages.includes(language)) {
														onTargetLanguagesChange(
															targetLanguages.filter(
																(target) => target !== language,
															),
														);
													}
												}}
											/>
										) : (
											<SearchableMultiLanguageSelect
												label={t("prestart.sourceLanguage")}
												values={sourceLanguages}
												disabled={busy}
												max={MAX_SOURCE_LANGUAGES}
												placeholder={t("prestart.selectSourceLanguage")}
												searchPlaceholder={t("prestart.searchSourceLanguage")}
												visibleValues={designPrestartLanguagePreset}
												onChange={onSourceLanguagesChange}
											/>
										)}
									</div>
								</div>
							)}
						</div>

						<div className="prestart-language-card prestart-language-card--display">
							<div className="field stt-field stt-field-composition stt-field-stack">
								<div className="stt-field__label stt-field-composition__label">
									{t("prestart.targetLanguage")}
								</div>
								<div className="stt-field-composition__control stt-field-stack__control">
									<SearchableMultiLanguageSelect
										label={t("prestart.targetLanguage")}
										values={targetLanguages}
										disabled={busy}
										max={MAX_TARGET_LANGUAGES}
										placeholder={t("prestart.selectTargetLanguage")}
										visibleValues={designPrestartLanguagePreset}
										excludedValues={singleSourceTargetExclusions}
										plainSelectedWhenSingle={
											effectiveRecognitionMode === "single" &&
											recognitionMode !== "auto"
										}
										menuState={{
											activeMenu,
											setActiveMenu,
										}}
										menuId="target-languages"
										onChange={onTargetLanguagesChange}
									/>
								</div>
								{effectiveRecognitionMode === "single" &&
								recognitionMode !== "auto" &&
								selectedSource ? (
									<small className="stt-field__hint">
										{t("prestart.singleTargetHint", {
											language: getLanguageLabel(selectedSource),
										})}
									</small>
								) : null}
							</div>
							<div className="field stt-field stt-field-composition stt-field-stack subtitle-display-field">
								<div className="stt-field__label stt-field-composition__label">
									{t("prestart.subtitleDisplay")}
								</div>
								<div className="stt-field-composition__control stt-field-stack__control">
									<SubtitleDisplaySelect
										value={subtitleDisplayMode}
										disabled={busy}
										menuState={{
											activeMenu,
											setActiveMenu,
										}}
										menuId="subtitle-display"
										onChange={onSubtitleDisplayModeChange}
									/>
								</div>
							</div>
						</div>
						<button
							type="button"
							className="adv-entry stt-advanced-settings-entry"
							onClick={onOpenAdvanced}
						>
							<span>
								<strong>{t("prestart.advancedEntryTitle")}</strong>
								<small>{t("prestart.advancedEntryHintDetailed")}</small>
							</span>
							<span className="stt-advanced-settings-entry__meta">
								<span className="chip stt-advanced-settings-entry__chip">
									{t("prestart.advancedEntryCount")}
								</span>
								<ArrowRight size={14} aria-hidden="true" />
							</span>
						</button>
					</div>
				) : null}

				{mode === "join" ? (
					<div className="group stt-prestart-group stt-prestart-join-hint">
						<p className="join-mode-hint">
							{t("prestart.joinModeLanguageHint")}
						</p>
					</div>
				) : null}

				<div
					className="group stt-prestart-group"
					data-migrated-component="PrestartGroup"
				>
					<div className="group-head stt-prestart-group__head">
						<strong className="stt-prestart-group__title">
							{t("prestart.deviceSettings")}
						</strong>
					</div>
					<div className="device-grid">
						<div
							className="device-card stt-device-setup-card"
							data-ready={microphoneReadyDisplay}
							data-migrated-component="DeviceSetupCard"
						>
							<div className="device-card-top stt-device-setup-card__top">
								<span className="device-icon">
									{microphoneReadyDisplay ? (
										<Mic size={16} />
									) : (
										<MicOff size={16} />
									)}
								</span>
								<div>
									<strong>{t("prestart.microphone")}</strong>
									<p className="sub">
										{microphoneReadyDisplay
											? t("prestart.microphoneStatusAuthorized")
											: t("prestart.microphoneStatusUnauthorized")}
									</p>
								</div>
								<button
									className="mini-btn stt-button stt-button--tertiary stt-button--sm"
									type="button"
									disabled={busy}
									onClick={onToggleMicrophone}
								>
									<span className="stt-button__content">
										{microphoneReadyDisplay
											? t("prestart.mute")
											: t("prestart.authorize")}
									</span>
								</button>
							</div>
							<div className="stt-device-setup-card__select">
								<label className="device-select-shell">
									<span className="sr-only">
										{t("prestart.microphoneDevice")}
									</span>
									<select
										className="device-select"
										value={selectedMicrophoneDeviceId}
										disabled={busy || microphoneDevices.length === 0}
										onChange={(event) =>
											onSelectMicrophoneDevice(event.target.value)
										}
									>
										{microphoneDeviceOptions.map((device) => (
											<option key={device.deviceId} value={device.deviceId}>
												{device.label}
											</option>
										))}
									</select>
									<ChevronDown size={12} aria-hidden="true" />
								</label>
							</div>
							<div
								className="level level-meter stt-device-setup-card__meter"
								aria-hidden="true"
							>
								<span
									className="level-fill"
									style={{ width: microphoneReadyDisplay ? "68%" : "8%" }}
								/>
							</div>
						</div>

						<div
							className="device-card stt-device-setup-card"
							data-ready={cameraPreviewDisplay}
							data-migrated-component="DeviceSetupCard"
						>
							<div className="device-card-top stt-device-setup-card__top">
								<span className="device-icon">
									{cameraPreviewDisplay ? (
										<Camera size={16} />
									) : (
										<CameraOff size={16} />
									)}
								</span>
								<div>
									<strong>{t("prestart.camera")}</strong>
									<p className="sub">
										{cameraPreviewDisplay
											? t("prestart.cameraStatusEnabled")
											: t("prestart.cameraStatusDisabled")}
									</p>
								</div>
								<button
									className="mini-btn stt-button stt-button--tertiary stt-button--sm"
									type="button"
									disabled={busy}
									onClick={onToggleCamera}
								>
									<span className="stt-button__content">
										{cameraPreviewDisplay
											? t("prestart.disablePreview")
											: t("prestart.enablePreview")}
									</span>
								</button>
							</div>
							<div className="stt-device-setup-card__select">
								<label className="device-select-shell">
									<span className="sr-only">{t("prestart.cameraDevice")}</span>
									<select
										className="device-select"
										value={selectedCameraDeviceId}
										disabled={busy || cameraDevices.length === 0}
										onChange={(event) =>
											onSelectCameraDevice(event.target.value)
										}
									>
										{cameraDeviceOptions.map((device) => (
											<option key={device.deviceId} value={device.deviceId}>
												{device.label}
											</option>
										))}
									</select>
									<ChevronDown size={12} aria-hidden="true" />
								</label>
							</div>
							<div
								ref={localVideoRef}
								className="camera-preview stt-device-setup-card__preview"
							>
								{cameraPreviewDisplay ? null : (
									<div className="camera-preview-placeholder">
										<span aria-hidden="true">
											<Camera size={28} />
										</span>
										<strong>{t("prestart.cameraUnavailable")}</strong>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			<footer className="prestart-foot stt-prestart-footer">
				<button
					className="start-btn stt-prestart-footer__start stt-button stt-button--primary"
					type="button"
					disabled={!canStart || busy}
					onClick={onStart}
				>
					<span className="stt-button__content">
						{busy
							? t("prestart.connecting")
							: mode === "join"
								? t("prestart.joinNow")
								: t("prestart.start")}
					</span>
				</button>
			</footer>
		</section>
	);
}
