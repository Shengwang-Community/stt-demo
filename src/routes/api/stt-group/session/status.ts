import { createFileRoute } from "@tanstack/react-router";
import { getSttSessionStatus } from "#/lib/stt-group/server/stt-rest";

export const Route = createFileRoute("/api/stt-group/session/status")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				try {
					const url = new URL(request.url);
					const agentId = url.searchParams.get("agentId");

					if (!agentId) {
						return Response.json(
							{ code: 1, msg: "Invalid request: agentId is required" },
							{ status: 400 },
						);
					}

					return Response.json(await getSttSessionStatus(agentId));
				} catch (error) {
					return Response.json(
						{
							code: 1,
							msg: error instanceof Error ? error.message : "STT status failed",
						},
						{ status: 400 },
					);
				}
			},
		},
	},
});
