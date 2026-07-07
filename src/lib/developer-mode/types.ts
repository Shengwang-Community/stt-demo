import type { DeveloperModeVendor } from "#/lib/stt-group";
import { DEFAULT_DEVELOPER_MODE_VENDOR } from "#/lib/stt-group";

export { DEFAULT_DEVELOPER_MODE_VENDOR } from "#/lib/stt-group";

export const subtitleMessageFormats = ["pb", "json"] as const;

export type SubtitleMessageFormat = (typeof subtitleMessageFormats)[number];

export const subtitleRenderModes = ["append", "aligned"] as const;

export type SubtitleRenderMode = (typeof subtitleRenderModes)[number];

export type DeveloperModeRequestOverridesState = {
	enabled: boolean;
	customAppId: string;
	requestBaseUrl: string;
	xServiceNamespace: string;
};

export type DeveloperModeState = {
	unlocked: boolean;
	enabled: boolean;
	showVttExport: boolean;
	sttVendor: DeveloperModeVendor;
	subtitleMessageFormat: SubtitleMessageFormat;
	subtitleRenderMode: SubtitleRenderMode;
	presetJsonOverride: string;
	requestOverrides: DeveloperModeRequestOverridesState;
	updatedAt: number;
};

export const defaultDeveloperModeState: DeveloperModeState = {
	unlocked: false,
	enabled: false,
	showVttExport: false,
	sttVendor: DEFAULT_DEVELOPER_MODE_VENDOR,
	subtitleMessageFormat: "pb",
	subtitleRenderMode: "append",
	presetJsonOverride: "",
	requestOverrides: {
		enabled: false,
		customAppId: "",
		requestBaseUrl: "",
		xServiceNamespace: "",
	},
	updatedAt: 0,
};
