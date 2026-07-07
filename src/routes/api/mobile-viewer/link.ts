import { createFileRoute } from "@tanstack/react-router";
import type { MobileViewerLinkRequest } from "#/lib/stt-group";
import { createMobileViewerLink } from "#/lib/stt-group/server/mobile-viewer";

export const Route = createFileRoute("/api/mobile-viewer/link")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const body = (await request.json()) as MobileViewerLinkRequest;
					const requestOrigin = new URL(request.url).origin;
					return Response.json(
						await createMobileViewerLink({
							requestOrigin,
							...body,
						}),
					);
				} catch (error) {
					return Response.json(
						{
							code: 1,
							msg:
								error instanceof Error ? error.message : "viewer link failed",
						},
						{ status: 400 },
					);
				}
			},
		},
	},
});
