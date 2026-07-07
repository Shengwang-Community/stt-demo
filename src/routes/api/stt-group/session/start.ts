import { createFileRoute } from "@tanstack/react-router";
import {
	isValidChannelName,
	type SttSessionStartRequest,
	validateLanguageSelection,
} from "#/lib/stt-group";
import {
	buildSttServerConfigWithOverrides,
	parseDeveloperOverrides,
} from "#/lib/stt-group/server/request-overrides";
import { startSttSession } from "#/lib/stt-group/server/stt-rest";

export const Route = createFileRoute("/api/stt-group/session/start")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const body =
						(await request.json()) as Partial<SttSessionStartRequest>;

					if (!body.channelName || !isValidChannelName(body.channelName)) {
						return Response.json(
							{ code: 1, msg: "Invalid request: channelName is required" },
							{ status: 400 },
						);
					}

					if (!body.controllerUserId || !body.controllerName) {
						return Response.json(
							{ code: 1, msg: "Invalid request: controller identity missing" },
							{ status: 400 },
						);
					}

					const languageValidation = validateLanguageSelection({
						recognitionMode: body.recognitionMode ?? "auto",
						sourceLanguages: body.sourceLanguages ?? [],
						targetLanguages: body.targetLanguages ?? [],
					});
					if (!languageValidation.ok) {
						return Response.json(
							{ code: 1, msg: languageValidation.message },
							{ status: 400 },
						);
					}
					const overrides = parseDeveloperOverrides(body.developerOverrides);
					const config = buildSttServerConfigWithOverrides(
						process.env,
						overrides,
					);

					const result = await startSttSession(
						{
							channelName: body.channelName,
							controllerUserId: body.controllerUserId,
							controllerName: body.controllerName,
							recognitionMode: languageValidation.selection.recognitionMode,
							sourceLanguages: languageValidation.selection.sourceLanguages,
							targetLanguages: languageValidation.selection.targetLanguages,
							enableJsonProtocol: body.enableJsonProtocol === true,
							sttVendor: body.sttVendor,
						},
						config,
					);

					return Response.json(result);
				} catch (error) {
					return Response.json(
						{
							code: 1,
							msg: error instanceof Error ? error.message : "STT start failed",
						},
						{ status: 400 },
					);
				}
			},
		},
	},
});
