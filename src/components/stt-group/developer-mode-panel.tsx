import { X } from "lucide-react";
import { useDeveloperMode } from "#/lib/developer-mode/store";
import {
	subtitleMessageFormats,
	subtitleRenderModes,
} from "#/lib/developer-mode/types";
import { useT } from "#/lib/i18n";
import { getAllowedSttVendorsFromEnv } from "#/lib/stt-group";

export function DeveloperModePanel({
	open,
	onClose,
	canRemoveExperienceLimit,
	experienceLimitAlreadyRemoved,
	onRemoveExperienceLimit,
}: {
	open: boolean;
	onClose: () => void;
	canRemoveExperienceLimit: boolean;
	experienceLimitAlreadyRemoved: boolean;
	onRemoveExperienceLimit: () => void;
}) {
	const t = useT();
	const {
		state,
		setEnabled,
		setShowVttExport,
		setVendor,
		setSubtitleMessageFormat,
		setSubtitleRenderMode,
		setRequestOverridesEnabled,
		setCustomAppId,
		setRequestBaseUrl,
		setXServiceNamespace,
	} = useDeveloperMode();

	if (!open) {
		return null;
	}

	const hasAnyRequestOverrideValue = [
		state.requestOverrides.customAppId,
		state.requestOverrides.requestBaseUrl,
		state.requestOverrides.xServiceNamespace,
	].some((value) => value.trim().length > 0);
	const allowedVendors = getAllowedSttVendorsFromEnv(import.meta.env);

	return (
		<div className="overlay stt-overlay" data-migrated-component="Overlay">
			<div
				className="dialog wide glass stt-dialog stt-dialog--wide"
				role="dialog"
				aria-labelledby="developerModeTitle"
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
						<h2 id="developerModeTitle">{t("developerMode.title")}</h2>
						<p>{t("developerMode.description")}</p>
					</div>
				</div>
				<div className="dialog-body stt-dialog__body developer-mode-panel">
					<label className="developer-mode-row">
						<input
							type="checkbox"
							checked={state.enabled}
							onChange={(event) => setEnabled(event.target.checked)}
						/>
						<span>{t("developerMode.enable")}</span>
					</label>
					<fieldset
						className="developer-mode-subfields"
						disabled={!state.enabled}
					>
						<div className="developer-mode-field">
							<span>{t("developerMode.removeExperienceLimit")}</span>
							<small>{t("developerMode.removeExperienceLimitHint")}</small>
							<button
								className="btn-secondary stt-button stt-button--secondary"
								type="button"
								disabled={
									!state.enabled ||
									!canRemoveExperienceLimit ||
									experienceLimitAlreadyRemoved
								}
								onClick={onRemoveExperienceLimit}
							>
								<span className="stt-button__content">
									{experienceLimitAlreadyRemoved
										? t("developerMode.removeExperienceLimitApplied")
										: t("developerMode.removeExperienceLimitApply")}
								</span>
							</button>
						</div>
						<label className="developer-mode-row">
							<input
								type="checkbox"
								checked={state.showVttExport}
								disabled={!state.enabled}
								onChange={(event) => setShowVttExport(event.target.checked)}
							/>
							<span>{t("developerMode.showVttExport")}</span>
						</label>
						<label className="developer-mode-field">
							<span>{t("developerMode.vendor")}</span>
							<select
								aria-label={t("developerMode.vendor")}
								className="text-input mono stt-input"
								disabled={!state.enabled}
								value={state.sttVendor}
								onChange={(event) =>
									setVendor(event.target.value as typeof state.sttVendor)
								}
							>
								{allowedVendors.map((vendor) => (
									<option key={vendor} value={vendor}>
										{vendor}
									</option>
								))}
							</select>
							<small>{t("developerMode.vendorAffectsFutureStarts")}</small>
						</label>
						<label className="developer-mode-field">
							<span>{t("developerMode.subtitleMessageFormat")}</span>
							<select
								className="text-input mono stt-input"
								disabled={!state.enabled}
								value={state.subtitleMessageFormat}
								onChange={(event) =>
									setSubtitleMessageFormat(
										event.target.value as typeof state.subtitleMessageFormat,
									)
								}
							>
								{subtitleMessageFormats.map((format) => (
									<option key={format} value={format}>
										{format === "pb" ? "PB" : t("developerMode.jsonFormat")}
									</option>
								))}
							</select>
							<small>{t("developerMode.subtitleMessageFormatHint")}</small>
						</label>
						<label className="developer-mode-field">
							<span>{t("developerMode.subtitleRenderMode")}</span>
							<select
								className="text-input mono stt-input"
								disabled={!state.enabled}
								value={state.subtitleRenderMode}
								onChange={(event) =>
									setSubtitleRenderMode(
										event.target.value as typeof state.subtitleRenderMode,
									)
								}
							>
								{subtitleRenderModes.map((mode) => (
									<option key={mode} value={mode}>
										{mode === "append"
											? t("developerMode.subtitleRenderModeAppend")
											: t("developerMode.subtitleRenderModeAligned")}
									</option>
								))}
							</select>
							<small>{t("developerMode.subtitleRenderModeHint")}</small>
						</label>
						<label className="developer-mode-row">
							<input
								type="checkbox"
								checked={state.requestOverrides.enabled}
								disabled={!state.enabled}
								onChange={(event) =>
									setRequestOverridesEnabled(event.target.checked)
								}
							/>
							<span>{t("developerMode.requestOverridesEnable")}</span>
						</label>
						<div className="developer-mode-field">
							<small>{t("developerMode.requestOverridesHint")}</small>
							{!state.enabled ? (
								<small>{t("developerMode.requestOverridesDisabledHint")}</small>
							) : hasAnyRequestOverrideValue &&
								!state.requestOverrides.enabled ? (
								<small>{t("developerMode.requestOverridesInactiveHint")}</small>
							) : null}
						</div>
						<label className="developer-mode-field">
							<span>{t("developerMode.customAppId")}</span>
							<input
								aria-label={t("developerMode.customAppId")}
								className="text-input mono stt-input"
								disabled={!state.enabled}
								placeholder={t("developerMode.customAppIdPlaceholder")}
								value={state.requestOverrides.customAppId}
								onChange={(event) => setCustomAppId(event.target.value)}
							/>
						</label>
						<label className="developer-mode-field">
							<span>{t("developerMode.requestBaseUrl")}</span>
							<input
								aria-label={t("developerMode.requestBaseUrl")}
								className="text-input mono stt-input"
								disabled={!state.enabled}
								placeholder={t("developerMode.requestBaseUrlPlaceholder")}
								value={state.requestOverrides.requestBaseUrl}
								onChange={(event) => setRequestBaseUrl(event.target.value)}
							/>
						</label>
						<label className="developer-mode-field">
							<span>{t("developerMode.xServiceNamespace")}</span>
							<input
								aria-label={t("developerMode.xServiceNamespace")}
								className="text-input mono stt-input"
								disabled={!state.enabled}
								placeholder={t("developerMode.xServiceNamespacePlaceholder")}
								value={state.requestOverrides.xServiceNamespace}
								onChange={(event) => setXServiceNamespace(event.target.value)}
							/>
						</label>
					</fieldset>
				</div>
				<footer className="developer-mode-footer">
					<button
						className="btn-ghost stt-button stt-button--tertiary"
						type="button"
						onClick={onClose}
					>
						<span className="stt-button__content">{t("common.cancel")}</span>
					</button>
					<button
						className="btn-primary stt-button stt-button--primary"
						type="button"
						onClick={onClose}
					>
						<span className="stt-button__content">
							{t("common.saveAndApply")}
						</span>
					</button>
				</footer>
			</div>
		</div>
	);
}
