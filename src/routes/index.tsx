import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AccessOverlays } from "#/components/stt-group/access-overlays";
import { LandingPage } from "#/components/stt-group/landing-page";
import { fetchSsoUserInfo, redirectToSsoLogin, redirectToSsoLogout } from "#/lib/sso";
import {
	createBrandSettings,
	DEFAULT_BRAND_SETTINGS,
	readBrandSettings,
	isSupportedLogoFile,
	type BrandSettings,
	writeBrandSettings,
} from "#/lib/stt-group";

export const Route = createFileRoute("/")({ component: Home });

type UserInfo = Record<string, unknown>;

const getDisplayName = (userInfo: UserInfo | null) => {
	if (!userInfo) {
		return "";
	}

	for (const key of ["displayName", "nickname", "email", "accountUid"]) {
		const value = userInfo[key];
		if (typeof value === "string" && value.length > 0) {
			return value;
		}
	}

	return "Authenticated user";
};

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
	const [userInfo, setUserInfo] = React.useState<UserInfo | null>(null);
	const [brandSettings, setBrandSettings] = React.useState<BrandSettings>(
		DEFAULT_BRAND_SETTINGS,
	);
	const [draftBrandSettings, setDraftBrandSettings] =
		React.useState<BrandSettings>(DEFAULT_BRAND_SETTINGS);
	const [pendingLogoFile, setPendingLogoFile] = React.useState<File | null>(null);
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
				const response = await fetchSsoUserInfo();

				if (isMounted) {
					setUserInfo((response?.data as UserInfo | undefined) ?? null);
				}
			} catch {
				if (isMounted) {
					setUserInfo(null);
				}
			}
		};

		void loadSession();

		return () => {
			isMounted = false;
		};
	}, []);

	const handleLogin = () => {
		redirectToSsoLogin();
	};

	const handlePrimaryAction = () => {
		if (userInfo) {
			window.location.href = "/app";
			return;
		}
		redirectToSsoLogin();
	};

	const handleLogout = () => {
		redirectToSsoLogout();
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
				loggedIn={Boolean(userInfo)}
				avatarLabel={getAvatarLabel(getDisplayName(userInfo))}
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
