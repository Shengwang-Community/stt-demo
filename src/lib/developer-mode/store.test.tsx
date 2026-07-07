// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DEVELOPER_MODE_STORAGE_KEY } from "./storage";
import { DeveloperModeProvider, useDeveloperMode } from "./store";

afterEach(() => {
	cleanup();
});

function Probe() {
	const {
		state,
		setEnabled,
		setShowVttExport,
		setVendor,
		setSubtitleMessageFormat,
		setSubtitleRenderMode,
		setRequestOverridesEnabled,
		setCustomAppId,
		setRequestBaseUrl,
		setXServiceNamespace,
		unlock,
		savePresetJsonOverride,
		presetJsonError,
	} = useDeveloperMode();

	return (
		<div>
			<div data-testid="enabled">{String(state.enabled)}</div>
			<div data-testid="unlocked">{String(state.unlocked)}</div>
			<div data-testid="show-vtt">{String(state.showVttExport)}</div>
			<div data-testid="stt-vendor">{state.sttVendor}</div>
			<div data-testid="subtitle-format">{state.subtitleMessageFormat}</div>
			<div data-testid="subtitle-render-mode">{state.subtitleRenderMode}</div>
			<div data-testid="request-overrides-enabled">
				{String(state.requestOverrides.enabled)}
			</div>
			<div data-testid="custom-app-id">
				{state.requestOverrides.customAppId}
			</div>
			<div data-testid="request-base-url">
				{state.requestOverrides.requestBaseUrl}
			</div>
			<div data-testid="x-service-namespace">
				{state.requestOverrides.xServiceNamespace}
			</div>
			<div data-testid="preset-error">{presetJsonError ?? ""}</div>
			<button type="button" onClick={() => unlock()}>
				unlock
			</button>
			<button type="button" onClick={() => setEnabled(true)}>
				enable
			</button>
			<button type="button" onClick={() => setShowVttExport(true)}>
				show-vtt
			</button>
			<button type="button" onClick={() => setVendor("tencent")}>
				set-vendor-tencent
			</button>
			<button type="button" onClick={() => setSubtitleMessageFormat("json")}>
				json-format
			</button>
			<button type="button" onClick={() => setSubtitleRenderMode("aligned")}>
				aligned-render-mode
			</button>
			<button type="button" onClick={() => setRequestOverridesEnabled(false)}>
				disable-request-overrides
			</button>
			<button type="button" onClick={() => setRequestOverridesEnabled(true)}>
				enable-request-overrides
			</button>
			<button type="button" onClick={() => setCustomAppId("custom-app-id")}>
				set-custom-app-id
			</button>
			<button
				type="button"
				onClick={() => setRequestBaseUrl("https://stt.example.com/root")}
			>
				set-request-base-url
			</button>
			<button type="button" onClick={() => setXServiceNamespace("team-a")}>
				set-x-service-namespace
			</button>
			<button type="button" onClick={() => savePresetJsonOverride("{bad")}>
				bad-json
			</button>
			<button
				type="button"
				onClick={() => savePresetJsonOverride('{"mode":"demo"}')}
			>
				good-json
			</button>
		</div>
	);
}

describe("DeveloperModeProvider", () => {
	it("updates booleans through exposed actions", () => {
		render(
			<DeveloperModeProvider>
				<Probe />
			</DeveloperModeProvider>,
		);

		act(() => {
			screen.getByText("unlock").click();
			screen.getByText("enable").click();
			screen.getByText("show-vtt").click();
		});

		expect(screen.getByTestId("unlocked").textContent).toBe("true");
		expect(screen.getByTestId("enabled").textContent).toBe("true");
		expect(screen.getByTestId("show-vtt").textContent).toBe("true");
	});

	it("defaults stt vendor to default", () => {
		render(
			<DeveloperModeProvider>
				<Probe />
			</DeveloperModeProvider>,
		);

		expect(screen.getByTestId("stt-vendor").textContent).toBe("default");
	});

	it("updates stt vendor through the exposed action", () => {
		render(
			<DeveloperModeProvider>
				<Probe />
			</DeveloperModeProvider>,
		);

		act(() => {
			screen.getByText("set-vendor-tencent").click();
		});

		expect(screen.getByTestId("stt-vendor").textContent).toBe("tencent");
	});

	it("defaults subtitle message format to pb and can switch to json", () => {
		render(
			<DeveloperModeProvider>
				<Probe />
			</DeveloperModeProvider>,
		);

		expect(screen.getByTestId("subtitle-format").textContent).toBe("pb");

		act(() => {
			screen.getByText("json-format").click();
		});

		expect(screen.getByTestId("subtitle-format").textContent).toBe("json");
	});

	it("defaults subtitle render mode to append and can switch to aligned", () => {
		render(
			<DeveloperModeProvider>
				<Probe />
			</DeveloperModeProvider>,
		);

		expect(screen.getByTestId("subtitle-render-mode").textContent).toBe(
			"append",
		);

		act(() => {
			screen.getByText("aligned-render-mode").click();
		});

		expect(screen.getByTestId("subtitle-render-mode").textContent).toBe(
			"aligned",
		);
	});

	it("loads the existing snapshot from browser storage on mount", async () => {
		window.localStorage.setItem(
			DEVELOPER_MODE_STORAGE_KEY,
			JSON.stringify({
				unlocked: true,
				enabled: true,
				showVttExport: true,
				sttVendor: "default",
				subtitleMessageFormat: "json",
				subtitleRenderMode: "aligned",
				presetJsonOverride: "",
				requestOverrides: {
					enabled: true,
					customAppId: "custom-app-id",
					requestBaseUrl: "https://stt.example.com/root",
					xServiceNamespace: "team-a",
				},
				updatedAt: 1,
			}),
		);

		render(
			<DeveloperModeProvider>
				<Probe />
			</DeveloperModeProvider>,
		);

		expect((await screen.findByTestId("unlocked")).textContent).toBe("true");
		expect((await screen.findByTestId("enabled")).textContent).toBe("true");
		expect((await screen.findByTestId("show-vtt")).textContent).toBe("true");
		expect((await screen.findByTestId("subtitle-format")).textContent).toBe(
			"json",
		);
		expect(
			(await screen.findByTestId("subtitle-render-mode")).textContent,
		).toBe("aligned");
		expect(
			(await screen.findByTestId("request-overrides-enabled")).textContent,
		).toBe("true");
		expect((await screen.findByTestId("custom-app-id")).textContent).toBe(
			"custom-app-id",
		);
	});

	it("auto-enables request overrides when a non-empty custom app id is entered", () => {
		render(
			<DeveloperModeProvider>
				<Probe />
			</DeveloperModeProvider>,
		);

		act(() => {
			screen.getByText("set-custom-app-id").click();
		});

		expect(screen.getByTestId("request-overrides-enabled").textContent).toBe(
			"true",
		);
		expect(screen.getByTestId("custom-app-id").textContent).toBe(
			"custom-app-id",
		);
	});

	it("keeps override values but stops applying them after manual disable", () => {
		render(
			<DeveloperModeProvider>
				<Probe />
			</DeveloperModeProvider>,
		);

		act(() => {
			screen.getByText("set-custom-app-id").click();
			screen.getByText("disable-request-overrides").click();
		});

		expect(screen.getByTestId("request-overrides-enabled").textContent).toBe(
			"false",
		);
		expect(screen.getByTestId("custom-app-id").textContent).toBe(
			"custom-app-id",
		);
	});

	it("blocks invalid preset JSON and keeps a field error", () => {
		render(
			<DeveloperModeProvider>
				<Probe />
			</DeveloperModeProvider>,
		);

		act(() => {
			screen.getByText("bad-json").click();
		});

		expect(screen.getByTestId("preset-error").textContent).toBeTruthy();
	});

	it("accepts valid preset JSON and clears the field error", () => {
		render(
			<DeveloperModeProvider>
				<Probe />
			</DeveloperModeProvider>,
		);

		act(() => {
			screen.getByText("bad-json").click();
			screen.getByText("good-json").click();
		});

		expect(screen.getByTestId("preset-error").textContent).toBe("");
	});
});
