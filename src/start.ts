import {
	createCsrfMiddleware,
	createMiddleware,
	createStart,
} from "@tanstack/react-start";
import { enforceApiAuth } from "#/lib/auth/server-auth";
import {
	getOrCreateRequestId,
	logInboundEnd,
	logInboundStart,
	runWithRequestContext,
} from "#/lib/server/http-log";

const defaultCsrfMiddleware = createCsrfMiddleware({
	filter: (ctx) => ctx.handlerType === "serverFn",
});

const requestLogger = createMiddleware().server(async ({ next, request }) => {
	const requestId = getOrCreateRequestId(request);
	const startedAt = performance.now();

	logInboundStart(request, requestId);

	try {
		const result = await runWithRequestContext({ requestId }, () => next());
		const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
		logInboundEnd({
			request,
			requestId,
			response: result.response,
			durationMs,
		});
		return result;
	} catch (error) {
		const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
		logInboundEnd({
			request,
			requestId,
			response: new Response(null, { status: 500 }),
			durationMs,
			error,
		});
		throw error;
	}
});

const apiAuthMiddleware = createMiddleware().server(({ request, next }) => {
	const unauthorizedResponse = enforceApiAuth(request);
	if (unauthorizedResponse) {
		return unauthorizedResponse;
	}

	return next();
});

export const startInstance = createStart(() => ({
	requestMiddleware: [defaultCsrfMiddleware, requestLogger, apiAuthMiddleware],
}));
