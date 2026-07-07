export const BRANDING_STORAGE_KEY = "stt-demo.brand-settings";
export const MAX_BRAND_NAME_LENGTH = 30;

export const BRAND_LOGO_SIZES = {
	webNav: 40,
	preview: 52,
	mobileNav: 32,
	mobileLogin: 64,
} as const;

export type BrandLogoAsset = {
	dataUrl: string;
	mimeType: string;
	name: string;
};

export type BrandSettings = {
	productName: string;
	logoAsset: BrandLogoAsset | null;
};

export const DEFAULT_BRAND_SETTINGS: BrandSettings = {
	productName: "声网实时转录翻译",
	logoAsset: null,
};

export const clampBrandName = (value: string) =>
	value.trim().slice(0, MAX_BRAND_NAME_LENGTH);

export const getBrandNameRemaining = (value: string) =>
	MAX_BRAND_NAME_LENGTH - clampBrandName(value).length;

export const createBrandSettings = (
	input: Partial<BrandSettings>,
): BrandSettings => ({
	productName:
		input.productName !== undefined
			? clampBrandName(input.productName)
			: DEFAULT_BRAND_SETTINGS.productName,
	logoAsset: input.logoAsset ?? DEFAULT_BRAND_SETTINGS.logoAsset,
});

export const isSupportedLogoFile = (file: { type: string; name: string }) => {
	const lowerName = file.name.toLowerCase();
	return (
		file.type === "image/png" ||
		file.type === "image/jpeg" ||
		file.type === "image/svg+xml" ||
		lowerName.endsWith(".png") ||
		lowerName.endsWith(".jpg") ||
		lowerName.endsWith(".jpeg") ||
		lowerName.endsWith(".svg")
	);
};

export const readBrandSettings = () => {
	if (typeof window === "undefined") {
		return DEFAULT_BRAND_SETTINGS;
	}

	const raw = window.localStorage.getItem(BRANDING_STORAGE_KEY);
	if (!raw) {
		return DEFAULT_BRAND_SETTINGS;
	}

	try {
		return createBrandSettings(JSON.parse(raw) as Partial<BrandSettings>);
	} catch {
		return DEFAULT_BRAND_SETTINGS;
	}
};

export const writeBrandSettings = (settings: BrandSettings) => {
	if (typeof window === "undefined") {
		return;
	}
	window.localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(settings));
};
