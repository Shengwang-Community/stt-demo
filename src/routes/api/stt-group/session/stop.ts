import { createFileRoute } from "@tanstack/react-router";
import {
	assertControllerCanStop,
	type SttSessionStopRequest,
} from "#/lib/stt-group";
import { stopSttSession } from "#/lib/stt-group/server/stt-rest";

export const Route = createFileRoute("/api/stt-group/session/stop")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const body = (await request.json()) as Partial<SttSessionStopRequest>;

					if (!body.agentId) {
						return Response.json(
							{ code: 1, msg: "Invalid request: agentId is required" },
							{ status: 400 },
						);
					}

					assertControllerCanStop({
						controllerUserId: body.controllerUserId ?? "",
						roomControllerUserId: body.roomControllerUserId ?? "",
					});

					const result = await stopSttSession(body.agentId);
					return Response.json(result);
				} catch (error) {
					return Response.json(
						{
							code: 1,
							msg: error instanceof Error ? error.message : "STT stop failed",
						},
						{ status: 400 },
					);
				}
			},
		},
	},
});
