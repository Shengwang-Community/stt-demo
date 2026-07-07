// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	DEVELOPER_MODE_STORAGE_KEY,
	loadDeveloperModeSnapshot,
	saveDeveloperModeSnapshot,
} from "./storage";
import { defaultDeveloperModeState } from "./types";

describe("developer mode storage", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
	});

	it("returns defaults when storage is empty", () => {
		expect(loadDeveloperModeSnapshot()).toEqual(defaultDeveloperModeState);
	});

	it("restores a valid snapshot from localStorage", () => {
		window.localStorage.setItem(
			DEVELOPER_MODE_STORAGE_KEY,
			JSON.stringify({
				...defaultDeveloperModeState,
				unlocked: true,
				enabled: true,
				showVttExport: true,
				requestOverrides: {
					enabled: true,
					customAppId: "custom-app-id",
					requestBaseUrl: "https://stt.example.com",
					xServiceNamespace: "team-a",
				},
				updatedAt: 123,
			}),
		);

		expect(loadDeveloperModeSnapshot()).toMatchObject({
			unlocked: true,
			enabled: true,
			showVttExport: true,
			requestOverrides: {
				enabled: true,
				customAppId: "custom-app-id",
				requestBaseUrl: "https://stt.example.com",
				xServiceNamespace: "team-a",
			},
			updatedAt: 123,
		});
	});

	it("falls back to empty request override fields when loading an old snapshot", () => {
		window.localStorage.setItem(
			DEVELOPER_MODE_STORAGE_KEY,
			JSON.stringify({
				unlocked: true,
				enabled: true,
				showVttExport: true,
				subtitleMessageFormat: "json",
				subtitleRenderMode: "aligned",
				updatedAt: 1,
			}),
		);

		expect(loadDeveloperModeSnapshot()).toMatchObject({
			unlocked: true,
			enabled: true,
			requestOverrides: {
				enabled: false,
				customAppId: "",
				requestBaseUrl: "",
				xServiceNamespace: "",
			},
		});
	});

	it("restores a configured vendor from localStorage", () => {
		vi.stubEnv("VITE_STT_VENDOR_OPTIONS", "agora,tencent");
		window.localStorage.setItem(
			DEVELOPER_MODE_STORAGE_KEY,
			JSON.stringify({
				...defaultDeveloperModeState,
				sttVendor: "tencent",
			}),
		);

		expect(loadDeveloperModeSnapshot().sttVendor).toBe("tencent");
	});

	it("falls back to default when the stored vendor is not allowed in this env", () => {
		vi.stubEnv("VITE_STT_VENDOR_OPTIONS", "agora,tencent");
		window.localStorage.setItem(
			DEVELOPER_MODE_STORAGE_KEY,
			JSON.stringify({
				...defaultDeveloperModeState,
				sttVendor: "soniox",
			}),
		);

		expect(loadDeveloperModeSnapshot().sttVendor).toBe("default");
	});

	it("falls back to defaults when storage JSON is invalid", () => {
		window.localStorage.setItem(DEVELOPER_MODE_STORAGE_KEY, "{not-json");

		expect(loadDeveloperModeSnapshot()).toEqual(defaultDeveloperModeState);
	});

	it("writes the snapshot back to localStorage", () => {
		saveDeveloperModeSnapshot({
			...defaultDeveloperModeState,
			enabled: true,
			updatedAt: 456,
		});

		expect(
			JSON.parse(
				window.localStorage.getItem(DEVELOPER_MODE_STORAGE_KEY) ?? "null",
			),
		).toMatchObject({
			enabled: true,
			updatedAt: 456,
		});
	});
});
