export type RtmPresenceEvent = {
	eventType?: number | string;
	channelName?: string;
	publisher?: string;
	stateChanged?: Record<string, string>;
	snapshot?: Array<{ userId?: string; states?: Record<string, string> }> | null;
	interval?: {
		join?:
			| Array<{ userId?: string; states?: Record<string, string> }>
			| { users?: string[] };
		leave?: Array<{ userId?: string }> | { users?: string[] };
		timeout?: Array<{ userId?: string }> | { users?: string[] };
		userStateList?: Array<{
			userId?: string;
			states?: Record<string, string>;
		}>;
	} | null;
};

type PresenceEventListener = (event: RtmPresenceEvent) => void;

type RtmPresenceEmitter = {
	addEventListener: (
		eventName: "presence",
		listener: PresenceEventListener,
	) => void;
	removeEventListener: (
		eventName: "presence",
		listener: PresenceEventListener,
	) => void;
};

const PRESENCE_READY_CHANNEL_PREFIX = "sttpresenceready-";
const PRESENCE_READY_TIMEOUT_MS = 5_000;
const PRESENCE_RETRY_DELAYS_MS = [300, 600, 1_200];

const sleep = (delayMs: number) =>
	new Promise<void>((resolve) => window.setTimeout(resolve, delayMs));

const getErrorCode = (error: unknown) => {
	if (typeof error !== "object" || error === null || !("code" in error)) {
		return undefined;
	}
	const code = Number((error as { code?: unknown }).code);
	return Number.isFinite(code) ? code : undefined;
};

const getErrorText = (error: unknown) => {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === "string") {
		return error;
	}
	if (typeof error === "object" && error !== null && "message" in error) {
		return String((error as { message?: unknown }).message);
	}
	return "";
};

export const isPresenceReadinessError = (error: unknown) => {
	const code = getErrorCode(error);
	const message = getErrorText(error);

	return (
		code === -13_001 ||
		message.includes("Presence service not connected") ||
		message.includes("PRESENCE_NOT_CONNECTED") ||
		message.includes("PRESENCE_NOT_READY")
	);
};

export const createPresenceReadyChannelName = (userId: string) =>
	`${PRESENCE_READY_CHANNEL_PREFIX}${userId.replaceAll("-", "").slice(-16)}`;

export const waitForPresenceSnapshot = (
	rtm: RtmPresenceEmitter,
	channelName: string,
	timeoutMs = PRESENCE_READY_TIMEOUT_MS,
) =>
	new Promise<void>((resolve) => {
		let settled = false;
		let timer: ReturnType<typeof window.setTimeout> | undefined;

		const finish = () => {
			if (settled) {
				return;
			}
			settled = true;
			if (timer) {
				window.clearTimeout(timer);
			}
			rtm.removeEventListener("presence", onPresence);
			resolve();
		};

		const onPresence: PresenceEventListener = (event) => {
			if (event.channelName === channelName && event.snapshot) {
				finish();
			}
		};

		timer = window.setTimeout(finish, timeoutMs);
		rtm.addEventListener("presence", onPresence);
	});

export const runPresenceOperationWithRetry = async <T>(
	operation: () => Promise<T>,
) => {
	let lastError: unknown;

	for (const retryDelayMs of [0, ...PRESENCE_RETRY_DELAYS_MS]) {
		if (retryDelayMs > 0) {
			await sleep(retryDelayMs);
		}

		try {
			return await operation();
		} catch (error) {
			if (!isPresenceReadinessError(error)) {
				throw error;
			}
			lastError = error;
		}
	}

	throw lastError;
};
