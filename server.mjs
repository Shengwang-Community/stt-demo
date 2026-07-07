import { join, normalize, relative } from "node:path";
import app from "./dist/server/server.js";

const clientRoot = join(import.meta.dirname, "dist", "client");

const contentTypes = {
	".css": "text/css; charset=utf-8",
	".gif": "image/gif",
	".html": "text/html; charset=utf-8",
	".ico": "image/x-icon",
	".jpeg": "image/jpeg",
	".jpg": "image/jpeg",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".png": "image/png",
	".svg": "image/svg+xml",
	".txt": "text/plain; charset=utf-8",
	".webp": "image/webp",
};

const isSafeClientPath = (filePath) => {
	const normalized = normalize(filePath);
	const rel = relative(clientRoot, normalized);
	return rel.length > 0 && !rel.startsWith("..") && !rel.startsWith("/");
};

const getExtension = (path) => {
	const index = path.lastIndexOf(".");
	return index === -1 ? "" : path.slice(index).toLowerCase();
};

const tryServeStatic = async (request) => {
	const url = new URL(request.url);
	const pathname = decodeURIComponent(url.pathname);
	const filePath = join(clientRoot, pathname === "/" ? "index.html" : pathname);

	if (!isSafeClientPath(filePath)) {
		return null;
	}

	const file = Bun.file(filePath);
	if (!(await file.exists())) {
		return null;
	}

	const headers = new Headers();
	const contentType = contentTypes[getExtension(filePath)];
	if (contentType) {
		headers.set("content-type", contentType);
	}

	return new Response(file, { headers });
};

const formatLocalTimestamp = (date) => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");
	const millis = String(date.getMilliseconds()).padStart(3, "0");
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${millis}`;
};

const formatIsoTimestamp = (date) => date.toISOString().replace("Z", "-0000");
const getRequestId = (request) =>
	request.headers.get("x-request-id") || crypto.randomUUID();

const getRequestIp = (request) => {
	const forwardedFor = request.headers.get("x-forwarded-for");
	const realIp = request.headers.get("x-real-ip");
	return forwardedFor?.split(",")[0]?.trim() || realIp || "-";
};

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
}) => {
	const now = new Date();
	const suffix = error ? ` error=${JSON.stringify(String(error))}` : "";
	return `${formatLocalTimestamp(now)}: [${requestId}] [${formatIsoTimestamp(now)}] [-] [${ip}] [INFO] [-] [${status}] ${httpStatus} ${durationSeconds.toFixed(3)} "${method} ${target}" ${host}${suffix}`;
};

const logStaticRequest = ({
	request,
	requestId,
	status,
	httpStatus,
	durationMs,
	error,
}) => {
	const url = new URL(request.url);
	console.log(
		toAccessLogLine({
			requestId,
			ip: getRequestIp(request),
			status,
			httpStatus,
			durationSeconds: durationMs / 1000,
			method: request.method,
			target: `${url.pathname}${url.search}`,
			host: url.host || "-",
			error,
		}),
	);
};

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const hostname = process.env.HOST ?? "0.0.0.0";

Bun.serve({
	hostname,
	port,
	async fetch(request) {
		if (request.method === "GET" || request.method === "HEAD") {
			const requestId = getRequestId(request);
			const startedAt = performance.now();
			const staticResponse = await tryServeStatic(request);
			if (staticResponse) {
				logStaticRequest({
					request,
					requestId,
					status: "Start",
					httpStatus: 0,
					durationMs: 0,
				});
				logStaticRequest({
					request,
					requestId,
					status: "Completed",
					httpStatus: staticResponse.status,
					durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
				});
				return staticResponse;
			}
		}

		return app.fetch(request);
	},
});

console.log(`stt-demo listening on http://${hostname}:${port}`);
