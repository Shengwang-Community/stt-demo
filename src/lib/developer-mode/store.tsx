import * as React from "react";
import {
	loadDeveloperModeSnapshot,
	saveDeveloperModeSnapshot,
} from "./storage";
import {
	type DeveloperModeState,
	type DeveloperModeVendor,
	defaultDeveloperModeState,
	type SubtitleMessageFormat,
	type SubtitleRenderMode,
} from "./types";

type DeveloperModeContextValue = {
	state: DeveloperModeState;
	presetJsonError: string | null;
	unlock: () => void;
	setEnabled: (enabled: boolean) => void;
	setShowVttExport: (enabled: boolean) => void;
	setVendor: (vendor: DeveloperModeVendor) => void;
	setSubtitleMessageFormat: (format: SubtitleMessageFormat) => void;
	setSubtitleRenderMode: (mode: SubtitleRenderMode) => void;
	setRequestOverridesEnabled: (enabled: boolean) => void;
	setCustomAppId: (value: string) => void;
	setRequestBaseUrl: (value: string) => void;
	setXServiceNamespace: (value: string) => void;
	savePresetJsonOverride: (value: string) => boolean;
};

const DeveloperModeContext =
	React.createContext<DeveloperModeContextValue | null>(null);

const withTimestamp = (
	current: DeveloperModeState,
	patch: Partial<DeveloperModeState>,
): DeveloperModeState => ({
	...current,
	...patch,
	updatedAt: Date.now(),
});

const withRequestOverrides = (
	current: DeveloperModeState,
	patch: Partial<DeveloperModeState["requestOverrides"]>,
): DeveloperModeState => {
	const nextRequestOverrides = {
		...current.requestOverrides,
		...patch,
	};
	const hasAnyValue = [
		nextRequestOverrides.customAppId,
		nextRequestOverrides.requestBaseUrl,
		nextRequestOverrides.xServiceNamespace,
	].some((value) => value.trim().length > 0);

	return withTimestamp(current, {
		requestOverrides: {
			...nextRequestOverrides,
			enabled:
				patch.enabled ?? (hasAnyValue ? true : nextRequestOverrides.enabled),
		},
	});
};

export function DeveloperModeProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [state, setState] = React.useState<DeveloperModeState>(
		defaultDeveloperModeState,
	);
	const [storageReady, setStorageReady] = React.useState(false);
	const [presetJsonError, setPresetJsonError] = React.useState<string | null>(
		null,
	);

	React.useEffect(() => {
		setState(loadDeveloperModeSnapshot());
		setStorageReady(true);
	}, []);

	React.useEffect(() => {
		if (!storageReady) {
			return;
		}
		saveDeveloperModeSnapshot(state);
	}, [state, storageReady]);

	const update = React.useCallback((patch: Partial<DeveloperModeState>) => {
		setState((current) => withTimestamp(current, patch));
	}, []);

	const updateRequestOverrides = React.useCallback(
		(patch: Partial<DeveloperModeState["requestOverrides"]>) => {
			setState((current) => withRequestOverrides(current, patch));
		},
		[],
	);

	const value = React.useMemo<DeveloperModeContextValue>(
		() => ({
			state,
			presetJsonError,
			unlock: () => update({ unlocked: true }),
			setEnabled: (enabled) => update({ enabled }),
			setShowVttExport: (enabled) => update({ showVttExport: enabled }),
			setVendor: (sttVendor) => update({ sttVendor }),
			setSubtitleMessageFormat: (subtitleMessageFormat) =>
				update({ subtitleMessageFormat }),
			setSubtitleRenderMode: (subtitleRenderMode) =>
				update({ subtitleRenderMode }),
			setRequestOverridesEnabled: (enabled) =>
				updateRequestOverrides({ enabled }),
			setCustomAppId: (customAppId) => updateRequestOverrides({ customAppId }),
			setRequestBaseUrl: (requestBaseUrl) =>
				updateRequestOverrides({ requestBaseUrl }),
			setXServiceNamespace: (xServiceNamespace) =>
				updateRequestOverrides({ xServiceNamespace }),
			savePresetJsonOverride: (value) => {
				if (!value.trim()) {
					setPresetJsonError(null);
					update({ presetJsonOverride: "" });
					return true;
				}

				try {
					JSON.parse(value);
					setPresetJsonError(null);
					update({ presetJsonOverride: value });
					return true;
				} catch {
					setPresetJsonError("Preset JSON must be valid JSON.");
					return false;
				}
			},
		}),
		[state, presetJsonError, update, updateRequestOverrides],
	);

	return (
		<DeveloperModeContext.Provider value={value}>
			{children}
		</DeveloperModeContext.Provider>
	);
}

export const useDeveloperMode = () => {
	const context = React.useContext(DeveloperModeContext);
	if (!context) {
		throw new Error("DeveloperModeProvider is missing");
	}
	return context;
};
