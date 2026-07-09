import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AccessOverlays } from "#/components/stt-group/access-overlays";
import { LandingPage } from "#/components/stt-group/landing-page";
import {
	type AppIdentity,
	fetchAuthSession,
	redirectToAuthLogout,
} from "#/lib/auth";
import { redirectToSsoLogin } from "#/lib/sso";
import {
	type BrandSettings,
	createBrandSettings,
	DEFAULT_BRAND_SETTINGS,
	isSupportedLogoFile,
	readBrandSettings,
	writeBrandSettings,
} from "#/lib/stt-group";

export const Route = createFileRoute("/")({ component: Home });

const getAvatarLabel = (displayName: string) => {
	const trimmed = displayName.trim();
	if (!trimmed) {
		return "ME";
	}
	if (/^[A-Za-z]/.test(trimmed)) {
		return trimmed.slice(0, 2).toUpperCase();
	}
	return trimmed.slice(0, 1);
};

function Home() {
	const [identity, setIdentity] = React.useState<AppIdentity | null>(null);
	const [brandSettings, setBrandSettings] = React.useState<BrandSettings>(
		DEFAULT_BRAND_SETTINGS,
	);
	const [draftBrandSettings, setDraftBrandSettings] =
		React.useState<BrandSettings>(DEFAULT_BRAND_SETTINGS);
	const [pendingLogoFile, setPendingLogoFile] = React.useState<File | null>(
		null,
	);
	const [activeOverlay, setActiveOverlay] = React.useState<
		"plugin" | "skin-settings" | null
	>(null);

	React.useEffect(() => {
		document.body.dataset.page = "landing";
		return () => {
			delete document.body.dataset.page;
		};
	}, []);

	React.useEffect(() => {
		setBrandSettings(readBrandSettings());
	}, []);

	React.useEffect(() => {
		writeBrandSettings(createBrandSettings(brandSettings));
	}, [brandSettings]);

	React.useEffect(() => {
		setDraftBrandSettings(readBrandSettings());
	}, []);

	React.useEffect(() => {
		let isMounted = true;

		const loadSession = async () => {
			try {
				const response = await fetchAuthSession();

				if (isMounted) {
					setIdentity(response?.data ?? null);
				}
			} catch {
				if (isMounted) {
					setIdentity(null);
				}
			}
		};

		void loadSession();

		return () => {
			isMounted = false;
		};
	}, []);

	const handleLogin = async () => {
		try {
			const response = await fetchAuthSession();
			if (response?.data.authMode === "guest") {
				window.location.href = "/app";
				return;
			}
		} catch {
			// Fall through to the SSO login route for SSO-mode unauthenticated users.
		}
		redirectToSsoLogin();
	};

	const handlePrimaryAction = () => {
		if (identity) {
			window.location.href = "/app";
			return;
		}
		void handleLogin();
	};

	const handleLogout = () => {
		redirectToAuthLogout();
	};

	const handleOpenSkinSettings = () => {
		setDraftBrandSettings(createBrandSettings(brandSettings));
		setPendingLogoFile(null);
		setActiveOverlay("skin-settings");
	};

	const handleOpenPlugin = () => {
		setActiveOverlay("plugin");
	};

	const handleCloseOverlay = () => {
		setDraftBrandSettings(createBrandSettings(brandSettings));
		setPendingLogoFile(null);
		setActiveOverlay(null);
	};

	const handleLogoSelected = (file: File) => {
		if (!isSupportedLogoFile(file)) {
			return;
		}
		setPendingLogoFile(file);
	};

	const handleLogoConfirmed = (dataUrl: string, file: File) => {
		setDraftBrandSettings(
			createBrandSettings({
				...draftBrandSettings,
				logoAsset: {
					dataUrl,
					mimeType: file.type,
					name: file.name,
				},
			}),
		);
		setPendingLogoFile(null);
	};

	const handleConfirmBrandSettings = () => {
		setBrandSettings(createBrandSettings(draftBrandSettings));
		setPendingLogoFile(null);
		setActiveOverlay(null);
	};

	return (
		<>
			<LandingPage
				onLogin={handleLogin}
				onPrimaryAction={handlePrimaryAction}
				onLogout={handleLogout}
				onOpenPlugin={handleOpenPlugin}
				onOpenSkinSettings={handleOpenSkinSettings}
				brandName={brandSettings.productName}
				brandLogoUrl={brandSettings.logoAsset?.dataUrl ?? null}
				loggedIn={Boolean(identity)}
				avatarLabel={getAvatarLabel(identity?.displayName ?? "")}
			/>
			<AccessOverlays
				channelName=""
				activeOverlay={activeOverlay}
				brandSettings={draftBrandSettings}
				pendingLogoFile={pendingLogoFile}
				onBrandSettingsChange={(next) =>
					setDraftBrandSettings(createBrandSettings(next))
				}
				onConfirmBrandSettings={handleConfirmBrandSettings}
				onLogoSelected={handleLogoSelected}
				onLogoCanceled={() => setPendingLogoFile(null)}
				onLogoConfirmed={handleLogoConfirmed}
				onLogoReedit={setPendingLogoFile}
				onClose={handleCloseOverlay}
				onConfirmStop={() => {}}
			/>
		</>
	);
}
