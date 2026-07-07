import { createFileRoute } from "@tanstack/react-router";
import { isValidChannelName, type RtcTokenRequest } from "#/lib/stt-group";
import {
	buildRtcTokenConfigWithOverrides,
	parseDeveloperOverrides,
} from "#/lib/stt-group/server/request-overrides";
import { createRtcToken } from "#/lib/stt-group/server/tokens";

export const Route = createFileRoute("/api/rtc/token")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const body = (await request.json()) as Partial<RtcTokenRequest>;

					if (!body.channelName || !isValidChannelName(body.channelName)) {
						return Response.json(
							{ code: 1, msg: "Invalid request: channelName is required" },
							{ status: 400 },
						);
					}

					if (!body.uid) {
						return Response.json(
							{ code: 1, msg: "Invalid request: uid is required" },
							{ status: 400 },
						);
					}
					const overrides = parseDeveloperOverrides(body.developerOverrides);
					const config = buildRtcTokenConfigWithOverrides(
						process.env,
						overrides,
					);

					return Response.json(
						createRtcToken({
							channelName: body.channelName,
							uid: body.uid,
							config,
						}),
					);
				} catch (error) {
					return Response.json(
						{
							code: 1,
							msg: error instanceof Error ? error.message : "RTC token failed",
						},
						{ status: 400 },
					);
				}
			},
		},
	},
});
