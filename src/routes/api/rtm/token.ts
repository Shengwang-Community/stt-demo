import { createFileRoute } from "@tanstack/react-router";
import type { RtmTokenRequest } from "#/lib/stt-group";
import { createRtmToken } from "#/lib/stt-group/server/tokens";

export const Route = createFileRoute("/api/rtm/token")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const body = (await request.json()) as Partial<RtmTokenRequest>;

					if (!body.userId) {
						return Response.json(
							{ code: 1, msg: "Invalid request: userId is required" },
							{ status: 400 },
						);
					}

					return Response.json(createRtmToken({ userId: body.userId }));
				} catch (error) {
					return Response.json(
						{
							code: 1,
							msg: error instanceof Error ? error.message : "RTM token failed",
						},
						{ status: 400 },
					);
				}
			},
		},
	},
});
