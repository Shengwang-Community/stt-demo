import { createFileRoute } from "@tanstack/react-router";
import { zipSync } from "fflate";
import {
	CaptionFileNotFoundError,
	downloadCaptionObject,
	listCaptionDownloadItems,
} from "#/lib/stt-group/server/caption-storage";
import { getAgoraServerConfig } from "#/lib/stt-group/server/env";

const CAPTION_STORAGE_DISABLED_MESSAGE = "VTT 下载未启用，请配置对象存储参数";

export const Route = createFileRoute("/api/stt-group/session/vtt")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				try {
					const url = new URL(request.url);
					const channelName = url.searchParams.get("channelName") ?? "";
					const sessionId = url.searchParams.get("sessionId") ?? "";
					const type = url.searchParams.get("type");
					const action = url.searchParams.get("action") ?? "list";
					const key = url.searchParams.get("key") ?? "";
					const targetLanguage = url.searchParams.get("targetLanguage") ?? "";

					if (!channelName) {
						return Response.json(
							{ code: 1, msg: "Invalid request: channelName is required" },
							{ status: 400 },
						);
					}

					if (!sessionId) {
						return Response.json(
							{ code: 1, msg: "Invalid request: sessionId is required" },
							{ status: 400 },
						);
					}

					if (type !== "source" && type !== "target") {
						return Response.json(
							{
								code: 1,
								msg: "Invalid request: type must be source or target",
							},
							{ status: 400 },
						);
					}

					const config = getAgoraServerConfig().captionStorage;

					if (!config) {
						return Response.json(
							{ code: 1, msg: CAPTION_STORAGE_DISABLED_MESSAGE },
							{ status: 400 },
						);
					}

					if (action === "download-zip") {
						const items = await listCaptionDownloadItems({
							config,
							channelName,
							sessionId,
							type,
							targetLanguage: type === "target" ? targetLanguage : undefined,
						});
						console.log(
							`[DEBUG-vtt-zip] items=${JSON.stringify(items.map((item) => item.key))} channelName=${channelName} sessionId=${sessionId} type=${type} targetLanguage=${targetLanguage}`,
						);
						const files = Object.fromEntries(
							await Promise.all(
								items.map(async (item) => {
									try {
										return [
											item.filename,
											new Uint8Array(
												await downloadCaptionObject({
													config,
													channelName,
													sessionId,
													type,
													key: item.key,
												}),
											),
										] as const;
									} catch (error) {
										console.log(
											`[DEBUG-vtt-zip] failed-key=${item.key} error=${
												error instanceof Error ? error.message : String(error)
											}`,
										);
										throw error;
									}
								}),
							),
						);

						return new Response(zipSync(files), {
							status: 200,
							headers: {
								"Content-Type": "application/zip",
								"Content-Disposition": `attachment; filename="${channelName}-${type}-vtt.zip"`,
							},
						});
					}

					if (action === "download") {
						if (!key) {
							return Response.json(
								{ code: 1, msg: "Invalid request: key is required" },
								{ status: 400 },
							);
						}
						console.log(
							`[DEBUG-vtt-path] download key=${key} channelName=${channelName} sessionId=${sessionId} type=${type}`,
						);

						const file = await downloadCaptionObject({
							config,
							channelName,
							sessionId,
							type,
							key,
						});

						return new Response(file, {
							status: 200,
							headers: {
								"Content-Type": "text/vtt;charset=utf-8",
								"Content-Disposition": `attachment; filename="${
									key.split("/").at(-1) ?? `${channelName}-${type}.vtt`
								}"`,
							},
						});
					}

					const items = await listCaptionDownloadItems({
						config,
						channelName,
						sessionId,
						type,
						targetLanguage: type === "target" ? targetLanguage : undefined,
					});

					return Response.json({ items });
				} catch (error) {
					if (error instanceof CaptionFileNotFoundError) {
						return Response.json(
							{ code: 1, msg: error.message },
							{ status: 404 },
						);
					}

					return Response.json(
						{
							code: 1,
							msg:
								error instanceof Error
									? error.message
									: "VTT 文件读取失败，请检查对象存储配置",
						},
						{ status: 400 },
					);
				}
			},
		},
	},
});
