import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

type RequestLogContext = {
	requestId: string;
};

type LogStatus = "Start" | "Completed";

type AccessLogFields = {
	requestId: string;
	ip: string;
	status: LogStatus;
	httpStatus: number;
	durationSeconds: string;
	method: string;
	target: string;
	host: string;
	error?: string;
};

const requestContextStorage = new AsyncLocalStorage<RequestLogContext>();

const formatLocalTimestamp = (date: Date) => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");
	const millis = String(date.getMilliseconds()).padStart(3, "0");
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${millis}`;
};

const formatIsoTimestamp = (date: Date) =>
	date.toISOString().replace("Z", "-0000");

const formatDurationSeconds = (durationMs: number) =>
	(durationMs / 1000).toFixed(3);

const getErrorMessage = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

const toAccessLogLine = ({
	requestId,
	ip,
	status,
	httpStatus,
	durationSeconds,
	method,
	target,
	host,
	error,
}: AccessLogFields) => {
	const now = new Date();
	const localTimestamp = formatLocalTimestamp(now);
	const isoTimestamp = formatIsoTimestamp(now);
	const suffix = error ? ` error=${JSON.stringify(error)}` : "";

	return `${localTimestamp}: [${requestId}] [${isoTimestamp}] [-] [${ip}] [INFO] [-] [${status}] ${httpStatus} ${durationSeconds} "${method} ${target}" ${host}${suffix}`;
};

const getUrlParts = (value: string) => {
	try {
		const url = new URL(value);
		return {
			target: `${url.pathname}${url.search}`,
			host: url.host || "-",
		};
	} catch {
		return {
			target: value,
			host: "-",
		};
	}
};

export const getRequestContext = () => requestContextStorage.getStore();

export const runWithRequestContext = <T>(
	context: RequestLogContext,
	callback: () => T,
) => requestContextStorage.run(context, callback);

export const getOrCreateRequestId = (request: Request) =>
	request.headers.get("x-request-id") || randomUUID();

export const getRequestIp = (request: Request) => {
	const forwardedFor = request.headers.get("x-forwarded-for");
	const realIp = request.headers.get("x-real-ip");
	return forwardedFor?.split(",")[0]?.trim() || realIp || "-";
};

export const logInboundStart = (request: Request, requestId: string) => {
	const url = new URL(request.url);
	console.log(
		toAccessLogLine({
			requestId,
			ip: getRequestIp(request),
			status: "Start",
			httpStatus: 0,
			durationSeconds: "0.000",
			method: request.method,
			target: `${url.pathname}${url.search}`,
			host: url.host || "-",
		}),
	);
};

export const logInboundEnd = ({
	request,
	requestId,
	response,
	durationMs,
	error,
}: {
	request: Request;
	requestId: string;
	response: Response;
	durationMs: number;
	error?: unknown;
}) => {
	const url = new URL(request.url);
	console.log(
		toAccessLogLine({
			requestId,
			ip: getRequestIp(request),
			status: "Completed",
			httpStatus: response.status,
			durationSeconds: formatDurationSeconds(durationMs),
			method: request.method,
			target: `${url.pathname}${url.search}`,
			host: url.host || "-",
			error: error ? getErrorMessage(error) : undefined,
		}),
	);
};

export const createServerFetch = async (
	input: RequestInfo | URL,
	init?: RequestInit,
) => {
	const requestId = getRequestContext()?.requestId || randomUUID();
	const method =
		init?.method ||
		(input instanceof Request ? input.method : undefined) ||
		"GET";
	const inputUrl =
		typeof input === "string"
			? input
			: input instanceof URL
				? input.toString()
				: input.url;
	const { target, host } = getUrlParts(inputUrl);
	const startedAt = performance.now();

	console.log(
		toAccessLogLine({
			requestId,
			ip: "-",
			status: "Start",
			httpStatus: 0,
			durationSeconds: "0.000",
			method,
			target,
			host,
		}),
	);

	try {
		const response = await fetch(input, init);
		const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
		console.log(
			toAccessLogLine({
				requestId,
				ip: "-",
				status: "Completed",
				httpStatus: response.status,
				durationSeconds: formatDurationSeconds(durationMs),
				method,
				target,
				host,
			}),
		);
		return response;
	} catch (error) {
		const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
		console.log(
			toAccessLogLine({
				requestId,
				ip: "-",
				status: "Completed",
				httpStatus: 500,
				durationSeconds: formatDurationSeconds(durationMs),
				method,
				target,
				host,
				error: getErrorMessage(error),
			}),
		);
		throw error;
	}
};
