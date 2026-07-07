import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadSessionVttFile, listSessionVtt } from "./api";

describe("session vtt client api", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("requests the expected local VTT list route", async () => {
		const fetchMock = vi.fn(async () =>
			Response.json({
				items: [
					{
						key: "sttdemo/captions/rooma/session1/zh-CN_a.vtt",
						filename: "zh-CN_a.vtt",
					},
				],
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		const items = await listSessionVtt({
			channelName: "room-a",
			sessionId: "session-1",
			type: "source",
		});

		expect(items).toEqual([
			{
				key: "sttdemo/captions/rooma/session1/zh-CN_a.vtt",
				filename: "zh-CN_a.vtt",
			},
		]);
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/stt-group/session/vtt?channelName=room-a&sessionId=session-1&type=source&action=list",
		);
	});

	it("requests the expected local VTT file download route", async () => {
		const fetchMock = vi.fn(async () =>
			new Response("WEBVTT", {
				status: 200,
				headers: { "Content-Type": "text/vtt;charset=utf-8" },
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		const bytes = await downloadSessionVttFile({
			channelName: "room-a",
			sessionId: "session-1",
			type: "target",
			key: "sttdemo/captions/rooma/session1/en-US_a.vtt",
		});

		expect(bytes).toBeInstanceOf(ArrayBuffer);
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/stt-group/session/vtt?channelName=room-a&sessionId=session-1&type=target&action=download&key=sttdemo%2Fcaptions%2Frooma%2Fsession1%2Fen-US_a.vtt",
		);
	});
});
