import { getAllowedSttVendorsFromEnv } from "#/lib/stt-group";
import {
	DEFAULT_DEVELOPER_MODE_VENDOR,
	type DeveloperModeState,
	defaultDeveloperModeState,
	subtitleMessageFormats,
	subtitleRenderModes,
} from "./types";

export const DEVELOPER_MODE_STORAGE_KEY = "stt-demo.developer-mode";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const sanitizeRequestOverrides = (
	value: unknown,
): DeveloperModeState["requestOverrides"] => {
	if (!isRecord(value)) {
		return defaultDeveloperModeState.requestOverrides;
	}

	return {
		enabled: value.enabled === true,
		customAppId:
			typeof value.customAppId === "string"
				? value.customAppId
				: defaultDeveloperModeState.requestOverrides.customAppId,
		requestBaseUrl:
			typeof value.requestBaseUrl === "string"
				? value.requestBaseUrl
				: defaultDeveloperModeState.requestOverrides.requestBaseUrl,
		xServiceNamespace:
			typeof value.xServiceNamespace === "string"
				? value.xServiceNamespace
				: defaultDeveloperModeState.requestOverrides.xServiceNamespace,
	};
};

const isAllowedVendorForCurrentEnv = (
	value: unknown,
): value is DeveloperModeState["sttVendor"] =>
	typeof value === "string" &&
	getAllowedSttVendorsFromEnv(import.meta.env).includes(
		value as DeveloperModeState["sttVendor"],
	);

const isSubtitleMessageFormat = (
	value: unknown,
): value is DeveloperModeState["subtitleMessageFormat"] =>
	typeof value === "string" &&
	subtitleMessageFormats.includes(
		value as DeveloperModeState["subtitleMessageFormat"],
	);

const isSubtitleRenderMode = (
	value: unknown,
): value is DeveloperModeState["subtitleRenderMode"] =>
	typeof value === "string" &&
	subtitleRenderModes.includes(
		value as DeveloperModeState["subtitleRenderMode"],
	);

const sanitizeSnapshot = (value: unknown): DeveloperModeState => {
	if (!isRecord(value)) {
		return defaultDeveloperModeState;
	}

	return {
		unlocked: value.unlocked === true,
		enabled: value.enabled === true,
		showVttExport: value.showVttExport === true,
		sttVendor: isAllowedVendorForCurrentEnv(value.sttVendor)
			? value.sttVendor
			: DEFAULT_DEVELOPER_MODE_VENDOR,
		subtitleMessageFormat: isSubtitleMessageFormat(value.subtitleMessageFormat)
			? value.subtitleMessageFormat
			: defaultDeveloperModeState.subtitleMessageFormat,
		subtitleRenderMode: isSubtitleRenderMode(value.subtitleRenderMode)
			? value.subtitleRenderMode
			: defaultDeveloperModeState.subtitleRenderMode,
		presetJsonOverride:
			typeof value.presetJsonOverride === "string"
				? value.presetJsonOverride
				: defaultDeveloperModeState.presetJsonOverride,
		requestOverrides: sanitizeRequestOverrides(value.requestOverrides),
		updatedAt:
			typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
				? value.updatedAt
				: defaultDeveloperModeState.updatedAt,
	};
};

export const loadDeveloperModeSnapshot = (): DeveloperModeState => {
	if (typeof window === "undefined") {
		return defaultDeveloperModeState;
	}

	try {
		const raw = window.localStorage.getItem(DEVELOPER_MODE_STORAGE_KEY);
		if (!raw) {
			return defaultDeveloperModeState;
		}
		return sanitizeSnapshot(JSON.parse(raw));
	} catch {
		return defaultDeveloperModeState;
	}
};

export const saveDeveloperModeSnapshot = (state: DeveloperModeState) => {
	if (typeof window === "undefined") {
		return;
	}

	try {
		window.localStorage.setItem(
			DEVELOPER_MODE_STORAGE_KEY,
			JSON.stringify(state),
		);
	} catch {
		// Keep the in-memory state even if browser persistence fails.
	}
};
