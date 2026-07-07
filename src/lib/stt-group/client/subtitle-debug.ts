type SubtitleDebugState = {
	rawSubtitleLoggingEnabled: boolean;
};

export type SubtitleDebugConsoleApi = {
	enabled: boolean;
	help: string;
	getState: () => SubtitleDebugState;
	setRawSubtitleLogging: (enabled: boolean) => boolean;
	enableRawSubtitleLogging: () => boolean;
	disableRawSubtitleLogging: () => boolean;
};

type SubtitleDebugGlobal = typeof globalThis & {
	__STT_DEMO_SUBTITLE_DEBUG__?: SubtitleDebugConsoleApi;
};

const SUBTITLE_DEBUG_HELP =
	'window.__STT_DEMO_SUBTITLE_DEBUG__.enableRawSubtitleLogging()';

const createSubtitleDebugConsoleApi = (): SubtitleDebugConsoleApi => {
	const state: SubtitleDebugState = {
		rawSubtitleLoggingEnabled: false,
	};

	return {
		get enabled() {
			return state.rawSubtitleLoggingEnabled;
		},
		set enabled(value: boolean) {
			state.rawSubtitleLoggingEnabled = value === true;
		},
		help: SUBTITLE_DEBUG_HELP,
		getState: () => ({ ...state }),
		setRawSubtitleLogging: (enabled) => {
			state.rawSubtitleLoggingEnabled = enabled;
			return state.rawSubtitleLoggingEnabled;
		},
		enableRawSubtitleLogging: () => {
			state.rawSubtitleLoggingEnabled = true;
			return true;
		},
		disableRawSubtitleLogging: () => {
			state.rawSubtitleLoggingEnabled = false;
			return false;
		},
	};
};

export const installSubtitleDebugConsoleApi = () => {
	const debugGlobal = globalThis as SubtitleDebugGlobal;
	if (!debugGlobal.__STT_DEMO_SUBTITLE_DEBUG__) {
		debugGlobal.__STT_DEMO_SUBTITLE_DEBUG__ = createSubtitleDebugConsoleApi();
	}
	return debugGlobal.__STT_DEMO_SUBTITLE_DEBUG__;
};

const getSubtitleDebugConsoleApi = () =>
	(globalThis as SubtitleDebugGlobal).__STT_DEMO_SUBTITLE_DEBUG__;

export const syncRawSubtitleLogging = (enabled: boolean) => {
	const api = installSubtitleDebugConsoleApi();
	return enabled
		? api.enableRawSubtitleLogging()
		: api.disableRawSubtitleLogging();
};

export const isRawSubtitleLoggingEnabled = () =>
	getSubtitleDebugConsoleApi()?.getState().rawSubtitleLoggingEnabled === true;

export const logSubtitleDebug = (label: string, payload: unknown) => {
	if (!isRawSubtitleLoggingEnabled()) {
		return;
	}

	console.info(`[subtitle-debug] ${label}`, payload);
};
