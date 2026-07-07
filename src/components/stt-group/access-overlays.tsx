import {
	FileJson2,
	ImagePlus,
	QrCode,
	TriangleAlert,
	X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import * as React from "react";
import { useT } from "#/lib/i18n";
import {
	type BrandSettings,
	getBrandNameRemaining,
	MAX_BRAND_NAME_LENGTH,
} from "#/lib/stt-group";

type CropState = {
	centerX: number;
	centerY: number;
	maxScale: number;
	minScale: number;
	naturalHeight: number;
	naturalWidth: number;
	scale: number;
};

const CROP_FRAME_SIZE = 240;
const CROP_BUTTON_STEPS = 7;

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

const clampCropState = (state: CropState): CropState => {
	const scale = clamp(state.scale, state.minScale, state.maxScale);
	const halfWidth = CROP_FRAME_SIZE / (2 * scale);
	const halfHeight = CROP_FRAME_SIZE / (2 * scale);

	return {
		...state,
		scale,
		centerX: clamp(state.centerX, halfWidth, state.naturalWidth - halfWidth),
		centerY: clamp(state.centerY, halfHeight, state.naturalHeight - halfHeight),
	};
};

const createInitialCropState = (
	naturalWidth: number,
	naturalHeight: number,
): CropState => {
	const minScale = Math.max(
		CROP_FRAME_SIZE / naturalWidth,
		CROP_FRAME_SIZE / naturalHeight,
	);

	return {
		centerX: naturalWidth / 2,
		centerY: naturalHeight / 2,
		maxScale: minScale * 4,
		minScale,
		naturalHeight,
		naturalWidth,
		scale: minScale,
	};
};

const loadImageSize = (src: string, fallbackMessage: string) =>
	new Promise<{ height: number; width: number }>((resolve, reject) => {
		const image = new Image();
		image.onload = () => {
			resolve({
				height: image.naturalHeight,
				width: image.naturalWidth,
			});
		};
		image.onerror = () => reject(new Error(fallbackMessage));
		image.src = src;
	});

const renderCroppedLogoDataUrl = ({
	file,
	src,
	state,
	cropCanvasErrorMessage,
	cropGenerateErrorMessage,
}: {
	file: File;
	src: string;
	state: CropState;
	cropCanvasErrorMessage: string;
	cropGenerateErrorMessage: string;
}) =>
	new Promise<string>((resolve, reject) => {
		const image = new Image();
		image.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = CROP_FRAME_SIZE;
			canvas.height = CROP_FRAME_SIZE;
			const context = canvas.getContext("2d");
			if (!context) {
				reject(new Error(cropCanvasErrorMessage));
				return;
			}

			const sourceWidth = CROP_FRAME_SIZE / state.scale;
			const sourceHeight = CROP_FRAME_SIZE / state.scale;
			const sourceX = state.centerX - sourceWidth / 2;
			const sourceY = state.centerY - sourceHeight / 2;

			context.drawImage(
				image,
				sourceX,
				sourceY,
				sourceWidth,
				sourceHeight,
				0,
				0,
				CROP_FRAME_SIZE,
				CROP_FRAME_SIZE,
			);

			const outputMimeType =
				file.type === "image/jpeg" ? "image/jpeg" : "image/png";
			resolve(canvas.toDataURL(outputMimeType));
		};
		image.onerror = () => reject(new Error(cropGenerateErrorMessage));
		image.src = src;
	});

const dataUrlToFile = ({
	dataUrl,
	name,
}: {
	dataUrl: string;
	name: string;
}) => {
	const [meta, payload] = dataUrl.split(",");
	const mimeMatch = meta.match(/data:(.*?);base64/);
	const mimeType = mimeMatch?.[1] ?? "image/png";
	const binary = atob(payload);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}

	return new File([bytes], name, { type: mimeType });
};

export type AccessOverlaysProps = {
	channelName: string;
	activeOverlay:
		| "plugin"
		| "qr"
		| "advanced"
		| "skin-settings"
		| "confirm-apply"
		| "confirm-stop"
		| null;
	brandSettings: BrandSettings;
	pendingLogoFile: File | null;
	viewerUrl?: string | null;
	viewerLinkLoading?: boolean;
	viewerLinkError?: string | null;
	onBrandSettingsChange: (next: BrandSettings) => void;
	onConfirmBrandSettings: () => void;
	onLogoSelected: (file: File) => void;
	onLogoCanceled: () => void;
	onLogoConfirmed: (dataUrl: string, file: File) => void;
	onLogoReedit: (file: File) => void;
	onClose: () => void;
	onConfirmStop: () => void;
};

export function AccessOverlays({
	channelName,
	activeOverlay,
	brandSettings,
	pendingLogoFile,
	viewerUrl,
	viewerLinkLoading = false,
	viewerLinkError = null,
	onBrandSettingsChange,
	onConfirmBrandSettings,
	onLogoSelected,
	onLogoCanceled,
	onLogoConfirmed,
	onLogoReedit,
	onClose,
	onConfirmStop,
}: AccessOverlaysProps) {
	void channelName;
	const t = useT();
	const [drawerKey, setDrawerKey] = React.useState<string | null>(null);
	const [confirmApplyOpen, setConfirmApplyOpen] = React.useState(false);
	const [cropError, setCropError] = React.useState<string | null>(null);
	const [cropLoading, setCropLoading] = React.useState(false);
	const [cropState, setCropState] = React.useState<CropState | null>(null);

	React.useEffect(() => {
		if (activeOverlay !== "advanced") {
			setConfirmApplyOpen(false);
		}
	}, [activeOverlay]);

	React.useEffect(() => {
		if (!activeOverlay) {
			return;
		}

		const handleKeydown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onClose();
			}
		};

		window.addEventListener("keydown", handleKeydown);
		return () => window.removeEventListener("keydown", handleKeydown);
	}, [activeOverlay, onClose]);
	const handleLogoInputChange = (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (file) {
			onLogoSelected(file);
			event.currentTarget.value = "";
		}
	};
	const handleLogoPreviewClick = () => {
		if (!brandSettings.logoAsset?.dataUrl) {
			return;
		}

		onLogoReedit(
			dataUrlToFile({
				dataUrl: brandSettings.logoAsset.dataUrl,
				name: brandSettings.logoAsset.name || "logo.png",
			}),
		);
	};
	const cropPreviewUrl = React.useMemo(
		() => (pendingLogoFile ? URL.createObjectURL(pendingLogoFile) : null),
		[pendingLogoFile],
	);
	React.useEffect(
		() => () => {
			if (cropPreviewUrl) {
				URL.revokeObjectURL(cropPreviewUrl);
			}
		},
		[cropPreviewUrl],
	);
	React.useEffect(() => {
		if (!cropPreviewUrl) {
			setCropState(null);
			setCropError(null);
			setCropLoading(false);
			return;
		}

		let cancelled = false;
		void loadImageSize(cropPreviewUrl, t("branding.logoPreviewLoadFailed"))
			.then(({ width, height }) => {
				if (!cancelled) {
					setCropState(createInitialCropState(width, height));
				}
			})
			.catch((error) => {
				if (!cancelled) {
					setCropError(
						error instanceof Error
							? error.message
							: t("branding.logoPreviewLoadFailed"),
					);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [cropPreviewUrl, t]);
	const advancedItems = [
		{
			key: "context",
			title: "通用上下文",
			desc: "领域、主题、角色等结构化数据",
			value: '{\n  "domain": "meeting",\n  "topic": "product review"\n}',
		},
		{
			key: "reference",
			title: "背景参考文本",
			desc: "传入背景资料，提升语义理解",
			value: '{\n  "background": ["roadmap summary", "customer glossary"]\n}',
		},
		{
			key: "hotwords",
			title: "自定义 ASR 热词",
			desc: "提升罕见词 / 品牌词 / 人名识别率",
			value: '{\n  "keywords": ["声网", "Agora", "实时互动"]\n}',
		},
		{
			key: "glossary",
			title: "翻译术语",
			desc: "指定源词 → 目标词的翻译映射",
			value: '{\n  "glossary": [{"source": "RTC", "target": "实时音视频"}]\n}',
		},
	];
	const renderAdvancedArrow = () => (
		<svg
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<path
				d="m9 6 6 6-6 6"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
	const activeDrawer = advancedItems.find((item) => item.key === drawerKey);
	const remainingBrandName = getBrandNameRemaining(brandSettings.productName);
	const dragStateRef = React.useRef<{
		originCenterX: number;
		originCenterY: number;
		originPointerX: number;
		originPointerY: number;
	} | null>(null);

	const handleCropPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		if (!cropState) {
			return;
		}

		dragStateRef.current = {
			originCenterX: cropState.centerX,
			originCenterY: cropState.centerY,
			originPointerX: event.clientX,
			originPointerY: event.clientY,
		};
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const handleCropPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		if (!cropState || !dragStateRef.current) {
			return;
		}

		const deltaX = event.clientX - dragStateRef.current.originPointerX;
		const deltaY = event.clientY - dragStateRef.current.originPointerY;

		setCropState(
			clampCropState({
				...cropState,
				centerX: dragStateRef.current.originCenterX - deltaX / cropState.scale,
				centerY: dragStateRef.current.originCenterY - deltaY / cropState.scale,
			}),
		);
	};

	const handleCropPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
		dragStateRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};

	const handleCropScaleChange = (nextScale: number) => {
		setCropState((current) =>
			current
				? clampCropState({
						...current,
						scale: nextScale,
					})
				: current,
		);
	};

	const handleCropStep = (direction: -1 | 1) => {
		setCropState((current) => {
			if (!current) {
				return current;
			}
			const stepSize =
				(current.maxScale - current.minScale) / CROP_BUTTON_STEPS;
			return clampCropState({
				...current,
				scale: current.scale + stepSize * direction,
			});
		});
	};

	const cropSliderValue = cropState
		? ((cropState.scale - cropState.minScale) /
				(cropState.maxScale - cropState.minScale || 1)) *
			100
		: 0;

	const handleConfirmCrop = async () => {
		if (!pendingLogoFile || !cropPreviewUrl || !cropState) {
			return;
		}

		setCropLoading(true);
		setCropError(null);
		try {
			const dataUrl = await renderCroppedLogoDataUrl({
				file: pendingLogoFile,
				src: cropPreviewUrl,
				state: cropState,
				cropCanvasErrorMessage: t("branding.logoCropCanvasFailed"),
				cropGenerateErrorMessage: t("branding.logoCropGenerateFailed"),
			});
			onLogoConfirmed(dataUrl, pendingLogoFile);
		} catch (error) {
			setCropError(
				error instanceof Error
					? error.message
					: t("branding.logoCropGenerateFailed"),
			);
		} finally {
			setCropLoading(false);
		}
	};

	return (
		<>
			{activeOverlay === "plugin" ? (
				<div className="overlay stt-overlay" data-migrated-component="Overlay">
					<div
						className="dialog glass stt-dialog"
						role="dialog"
						aria-labelledby="pluginTitle"
						data-migrated-component="Dialog"
					>
						<button
							className="dialog-close stt-surface-close"
							type="button"
							aria-label={t("common.close")}
							onClick={onClose}
						>
							<X size={14} />
						</button>
						<div className="dialog-head stt-dialog__head">
							<div className="dialog-head-icon stt-dialog__head-icon">
								<svg
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									aria-hidden="true"
								>
									<path
										d="M9 3v3a2 2 0 0 1-4 0V3M15 3v3a2 2 0 0 0 4 0V3M9 21v-3a2 2 0 0 0-4 0v3M15 21v-3a2 2 0 0 1 4 0v3M3 9h18M3 15h18"
										stroke="currentColor"
										strokeWidth="1.6"
										strokeLinecap="round"
									/>
								</svg>
							</div>
							<div>
								<h2 id="pluginTitle">{t("overlays.pluginTitle")}</h2>
								<p>{t("overlays.pluginBody")}</p>
							</div>
						</div>
						<div className="dialog-body stt-dialog__body">
							<ol className="steps stt-surface-steps">
								<li>
									<i>1</i>
									<span>{t("overlays.pluginStep1")}</span>
								</li>
								<li>
									<i>2</i>
									<span>{t("overlays.pluginStep2")}</span>
								</li>
								<li>
									<i>3</i>
									<span>{t("overlays.pluginStep3")}</span>
								</li>
							</ol>
							<div className="download-grid stt-surface-download-grid">
								<button
									className="download-card stt-surface-download-card"
									type="button"
								>
									<svg
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="currentColor"
										aria-hidden="true"
									>
										<path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11" />
									</svg>
									<div>
										<strong>{t("overlays.downloadMac")}</strong>
										<span className="mono">.app · macOS 12+</span>
									</div>
								</button>
								<button
									className="download-card stt-surface-download-card"
									type="button"
								>
									<svg
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="currentColor"
										aria-hidden="true"
									>
										<path d="M3 5.1L10.7 4v7.4H3M11.4 3.9l9.6-1.4v9H11.4M3 12.4h7.7v7.4L3 18.7M11.4 12.6H21V21l-9.6-1.3" />
									</svg>
									<div>
										<strong>{t("overlays.downloadWindows")}</strong>
										<span className="mono">.exe · Windows 10+</span>
									</div>
								</button>
							</div>
						</div>
					</div>
				</div>
			) : null}

			{activeOverlay === "qr" ? (
				<div className="overlay stt-overlay" data-migrated-component="Overlay">
					<div
						className="qr-dialog glass stt-dialog stt-dialog--qr"
						role="dialog"
						aria-labelledby="qrTitle"
						data-migrated-component="Dialog"
					>
						<button
							className="dialog-close stt-surface-close"
							type="button"
							aria-label={t("common.close")}
							onClick={onClose}
						>
							<X size={14} />
						</button>
						<h2 id="qrTitle">{t("overlays.qrTitle")}</h2>
						<div className="qr-box" aria-hidden="true">
							{viewerUrl ? (
								<QRCodeSVG value={viewerUrl} size={220} />
							) : (
								<QrCode size={220} />
							)}
						</div>
						<p>
							{viewerLinkLoading
								? t("overlays.qrGenerating")
								: viewerLinkError
									? viewerLinkError
									: t("overlays.qrHint")}
						</p>
						{viewerUrl ? (
							<>
								<div className="qr-url mono">{viewerUrl}</div>
								<div className="qr-actions">
									<button
										className="btn-primary stt-button stt-button--primary"
										type="button"
										onClick={() => void navigator.clipboard?.writeText(viewerUrl)}
									>
										<span className="stt-button__content">
											{t("overlays.copyViewerLink")}
										</span>
									</button>
								</div>
							</>
						) : null}
					</div>
				</div>
			) : null}

			{activeOverlay === "advanced" ? (
				<div className="overlay stt-overlay" data-migrated-component="Overlay">
					<div
						className="dialog wide glass stt-dialog stt-dialog--wide stt-dialog--advanced"
						role="dialog"
						aria-labelledby="advTitle"
						data-migrated-component="Dialog"
					>
						<button
							className="dialog-close stt-surface-close"
							type="button"
							aria-label={t("common.close")}
							onClick={onClose}
						>
							<X size={14} />
						</button>
						<div className="dialog-head plain stt-dialog__head stt-dialog__head--plain">
							<div>
								<h2 id="advTitle">{t("overlays.advancedTitle")}</h2>
								<p>{t("overlays.advancedImpactHint")}</p>
							</div>
						</div>
						<div className="dialog-body stt-dialog__body">
							<div className="adv-grid">
								{advancedItems.map((item) => (
									<button
										className="adv-card"
										type="button"
										key={item.key}
										onClick={() => setDrawerKey(item.key)}
									>
										<span className="adv-card-copy">
											<strong>{item.title}</strong>
											<p>{item.desc}</p>
										</span>
										<span className="adv-card-foot">
											<span className="json-tag">JSON</span>
											<span className="adv-card-arrow">
												{renderAdvancedArrow()}
											</span>
										</span>
									</button>
								))}
							</div>
						</div>
					</div>
				</div>
			) : null}

			{activeOverlay === "skin-settings" ? (
				<div className="overlay stt-overlay" data-migrated-component="Overlay">
					<div
						className="dialog wide glass stt-dialog stt-dialog--wide"
						role="dialog"
						aria-labelledby="skinTitle"
					>
						<button
							className="dialog-close stt-surface-close"
							type="button"
							aria-label={t("common.close")}
							onClick={onClose}
						>
							<X size={14} />
						</button>
						<div className="dialog-head plain stt-dialog__head stt-dialog__head--plain">
							<div>
								<h2 id="skinTitle">{t("overlays.skinTitle")}</h2>
								<p>{t("overlays.skinBody")}</p>
							</div>
						</div>
						<div className="dialog-body stt-dialog__body">
							<section className="brand-preview-card">
								<label className="brand-preview-card__logo brand-preview-card__logo--upload">
									<input
										className="sr-only"
										type="file"
										accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
										onChange={handleLogoInputChange}
									/>
									{brandSettings.logoAsset?.dataUrl ? (
										<button
											type="button"
											className="brand-preview-card__logo-button"
											onClick={handleLogoPreviewClick}
										>
											<img src={brandSettings.logoAsset.dataUrl} alt="" />
										</button>
									) : (
										<span>LOGO</span>
									)}
								</label>
								<div className="brand-preview-card__copy">
									<strong>{brandSettings.productName}</strong>
									<span>{t("overlays.skinPreviewHint")}</span>
								</div>
							</section>

							<section className="skin-settings-grid">
								<div className="stt-field-composition">
									<div className="stt-field-composition__label">
										{t("overlays.logoLabel")}
									</div>
									<div className="stt-field-composition__content stt-field">
										<label className="upload-card">
											<input
												className="sr-only"
												type="file"
												accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
												onChange={handleLogoInputChange}
											/>
											<span className="upload-card__content">
												<ImagePlus size={16} />
												<span>{t("overlays.uploadLogo")}</span>
											</span>
										</label>
										<span className="stt-field__hint">
											{t("overlays.logoHint")}
										</span>
									</div>
								</div>

								<div className="stt-field-composition">
									<div className="stt-field-composition__label">
										{t("overlays.productNameLabel")}
									</div>
									<label className="stt-field-composition__content stt-field">
										<input
											className="stt-field__input"
											type="text"
											placeholder={t("overlays.productNamePlaceholder")}
											value={brandSettings.productName}
											maxLength={MAX_BRAND_NAME_LENGTH}
											onChange={(event) =>
												onBrandSettingsChange({
													...brandSettings,
													productName: event.target.value,
												})
											}
										/>
										<span className="stt-field__hint">
											{t("overlays.productNameRemaining", {
												remaining: remainingBrandName,
											})}
										</span>
									</label>
								</div>
								<p className="stt-field__hint skin-settings-grid__note">
									{t("overlays.emptyNameHint")}
								</p>
							</section>
						</div>
						<footer className="drawer-foot stt-drawer__foot">
							<button
								className="btn-ghost stt-button stt-button--tertiary"
								type="button"
								onClick={onClose}
							>
								<span className="stt-button__content">
									{t("common.cancel")}
								</span>
							</button>
							<button
								className="btn-primary stt-button stt-button--primary"
								type="button"
								onClick={onConfirmBrandSettings}
							>
								<span className="stt-button__content">
									{t("common.confirm")}
								</span>
							</button>
						</footer>
					</div>
				</div>
			) : null}

			{activeDrawer ? (
				<div
					className="drawer glass stt-drawer"
					data-migrated-component="Drawer"
					role="dialog"
					aria-labelledby="drawerTitle"
				>
					<header className="drawer-head stt-drawer__head">
						<div>
							<h3 id="drawerTitle">{activeDrawer.title}</h3>
							<p>{activeDrawer.desc}</p>
							<div className="scope-chip stt-drawer__scope">
								{t("overlays.drawerRoomScope")}
							</div>
						</div>
						<button
							className="icon-btn ghost stt-surface-close"
							type="button"
							aria-label={t("common.close")}
							onClick={() => setDrawerKey(null)}
						>
							<X size={14} />
						</button>
					</header>
					<div className="drawer-body stt-drawer__body">
						<div className="drawer-toolbar stt-drawer__toolbar">
							<button className="mini-btn" type="button">
								{t("overlays.formatJson")}
							</button>
							<span className="json-hint mono">
								<FileJson2 size={13} />
								{t("overlays.jsonValidation")}
							</span>
							<span className="validity">{t("overlays.valid")}</span>
						</div>
						<textarea
							className="json-editor mono stt-json-editor stt-drawer__content"
							spellCheck={false}
							defaultValue={activeDrawer.value}
						/>
					</div>
					<footer className="drawer-foot stt-drawer__foot">
						<button
							className="btn-ghost stt-button stt-button--tertiary"
							type="button"
							onClick={() => setDrawerKey(null)}
						>
							<span className="stt-button__content">{t("common.cancel")}</span>
						</button>
						<button
							className="btn-primary stt-button stt-button--primary"
							type="button"
							onClick={() => setConfirmApplyOpen(true)}
						>
							<span className="stt-button__content">
								{t("common.saveAndApply")}
							</span>
						</button>
					</footer>
				</div>
			) : null}

			{activeOverlay === "confirm-apply" || confirmApplyOpen ? (
				<div className="overlay stt-overlay" data-migrated-component="Overlay">
					<div
						className="dialog narrow glass stt-dialog stt-dialog--confirm"
						role="dialog"
						aria-labelledby="confirmApplyTitle"
						aria-describedby="confirmApplyText"
						data-migrated-component="DialogConfirm"
					>
						<div className="dialog-head stt-dialog__head">
							<div className="dialog-head-icon stt-dialog__head-icon">
								<svg
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="currentColor"
									aria-hidden="true"
								>
									<path d="M3 7C3 5.067 4.567 3.5 6.5 3.5C8.433 3.5 10 5.067 10 7C10 8.933 8.433 10.5 6.5 10.5C4.567 10.5 3 8.933 3 7ZM20 8H12V6H20V8ZM14 17C14 15.067 15.567 13.5 17.5 13.5C19.433 13.5 21 15.067 21 17C21 18.933 19.433 20.5 17.5 20.5C15.567 20.5 14 18.933 14 17ZM12 16V18H4V16H12Z" />
								</svg>
							</div>
							<div>
								<h2 id="confirmApplyTitle">应用设置？</h2>
								<p id="confirmApplyText">
									修改将影响当前房间后续新产生的字幕结果。
								</p>
							</div>
						</div>
						<div className="dialog-actions stt-dialog__foot">
							<button
								className="btn-ghost stt-button stt-button--tertiary"
								type="button"
								onClick={() => setConfirmApplyOpen(false)}
							>
								<span className="stt-button__content">取消</span>
							</button>
							<button
								className="btn-primary stt-button stt-button--primary"
								type="button"
								onClick={() => {
									setConfirmApplyOpen(false);
									setDrawerKey(null);
								}}
							>
								<span className="stt-button__content">确认并应用</span>
							</button>
						</div>
					</div>
				</div>
			) : null}

			{activeOverlay === "confirm-stop" ? (
				<div className="overlay stt-overlay" data-migrated-component="Overlay">
					<div
						className="dialog narrow glass stt-dialog stt-dialog--confirm"
						role="dialog"
						aria-labelledby="confirmTitle"
						aria-describedby="confirmText"
						data-migrated-component="DialogConfirm"
					>
						<div className="dialog-head stt-dialog__head">
							<div className="dialog-head-icon stt-dialog__head-icon">
								<TriangleAlert size={22} />
							</div>
							<div>
								<h2 id="confirmTitle">{t("overlays.stopConfirmTitle")}</h2>
								<p id="confirmText">{t("overlays.stopConfirmBody")}</p>
							</div>
						</div>
						<div className="dialog-actions stt-dialog__foot">
							<button
								className="btn-ghost stt-button stt-button--tertiary"
								type="button"
								onClick={onClose}
							>
								<span className="stt-button__content">
									{t("common.cancel")}
								</span>
							</button>
							<button
								className="btn-primary stt-button stt-button--primary"
								type="button"
								onClick={onConfirmStop}
							>
								<span className="stt-button__content">
									{t("common.confirmLeave")}
								</span>
							</button>
						</div>
					</div>
				</div>
			) : null}

			{pendingLogoFile && cropPreviewUrl ? (
				<div className="overlay stt-overlay">
					<div
						className="dialog glass stt-dialog stt-dialog--crop"
						role="dialog"
					>
						<div className="dialog-head plain stt-dialog__head stt-dialog__head--plain">
							<div>
								<h2>{t("overlays.cropTitle")}</h2>
								<p>{t("overlays.cropBody")}</p>
							</div>
						</div>
						<div className="dialog-body stt-dialog__body">
							<div className="crop-shell">
								<div className="crop-shell__preview">
									<div
										className="crop-shell__frame"
										onPointerDown={handleCropPointerDown}
										onPointerMove={handleCropPointerMove}
										onPointerUp={handleCropPointerEnd}
										onPointerCancel={handleCropPointerEnd}
									>
										<img
											src={cropPreviewUrl}
											alt=""
											className="crop-shell__image"
											draggable={false}
											style={
												cropState
													? {
															width: `${cropState.naturalWidth * cropState.scale}px`,
															height: `${cropState.naturalHeight * cropState.scale}px`,
															left: `${CROP_FRAME_SIZE / 2 - cropState.centerX * cropState.scale}px`,
															top: `${CROP_FRAME_SIZE / 2 - cropState.centerY * cropState.scale}px`,
														}
													: undefined
											}
										/>
									</div>
								</div>
								<div className="crop-shell__controls">
									<button
										type="button"
										className="mini-btn"
										disabled={!cropState || cropLoading}
										onClick={() => handleCropStep(-1)}
									>
										-
									</button>
									<input
										type="range"
										min="0"
										max="100"
										step="1"
										value={cropSliderValue}
										disabled={!cropState || cropLoading}
										onChange={(event) => {
											if (!cropState) {
												return;
											}
											const ratio = Number(event.target.value) / 100;
											handleCropScaleChange(
												cropState.minScale +
													(cropState.maxScale - cropState.minScale) * ratio,
											);
										}}
									/>
									<button
										type="button"
										className="mini-btn"
										disabled={!cropState || cropLoading}
										onClick={() => handleCropStep(1)}
									>
										+
									</button>
								</div>
								<p className="stt-field__hint">{t("overlays.cropDragHint")}</p>
								<p className="stt-field__hint">{t("overlays.cropSaveHint")}</p>
								{cropError ? (
									<p className="stt-field__hint crop-shell__error">
										{cropError}
									</p>
								) : null}
							</div>
						</div>
						<footer className="drawer-foot stt-drawer__foot">
							<button
								className="btn-ghost stt-button stt-button--tertiary"
								type="button"
								onClick={onLogoCanceled}
							>
								<span className="stt-button__content">
									{t("common.cancel")}
								</span>
							</button>
							<button
								className="btn-primary stt-button stt-button--primary"
								type="button"
								disabled={!cropState || cropLoading}
								onClick={() => void handleConfirmCrop()}
							>
								<span className="stt-button__content">
									{cropLoading ? t("overlays.cropSaving") : t("common.confirm")}
								</span>
							</button>
						</footer>
					</div>
				</div>
			) : null}
		</>
	);
}
