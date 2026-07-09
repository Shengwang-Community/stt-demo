import { createFileRoute } from "@tanstack/react-router";
import { ERROR_CODES } from "#/lib/i18n";
import type { MobileViewerRtmTokenRequest } from "#/lib/stt-group";
import { createMobileViewerRtmToken } from "#/lib/stt-group/server/mobile-viewer";

export const Route = createFileRoute("/api/mobile-viewer/rtm-token")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const body = (await request.json()) as MobileViewerRtmTokenRequest;
					return Response.json(
						await createMobileViewerRtmToken({
							viewerToken: body.viewerToken,
							userId: body.userId,
						}),
					);
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "viewer RTM token failed";
					const errorCode =
						message === "链接无效或已过期"
							? ERROR_CODES.VIEWER_LINK_INVALID
							: message === "房间字幕已结束"
								? ERROR_CODES.ROOM_ENDED
								: ERROR_CODES.VIEWER_SESSION_FAILED;
					const status =
						errorCode === ERROR_CODES.VIEWER_SESSION_FAILED ? 500 : 400;
					return Response.json(
						{ code: 1, errorCode, msg: message },
						{ status },
					);
				}
			},
		},
	},
});
