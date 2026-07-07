import type { EnvLike } from "./server/env";

export const DEFAULT_DEVELOPER_MODE_VENDOR = "default" as const;

export const supportedSttVendors = [
	"microsoft",
	"agora",
	"soniox",
	"tencent",
	"deepgram",
] as const;

export type SupportedSttVendor = (typeof supportedSttVendors)[number];

export type DeveloperModeVendor =
	| typeof DEFAULT_DEVELOPER_MODE_VENDOR
	| SupportedSttVendor;

const isSupportedSttVendor = (value: string): value is SupportedSttVendor =>
	supportedSttVendors.includes(value as SupportedSttVendor);

export const getAllowedSttVendorsFromEnv = (
	env: Pick<EnvLike, "VITE_STT_VENDOR_OPTIONS">,
): DeveloperModeVendor[] => {
	const seen = new Set<string>();
	const configured = (env.VITE_STT_VENDOR_OPTIONS ?? "")
		.split(",")
		.map((item) => item.trim())
		.filter(isSupportedSttVendor)
		.filter((item) => {
			if (seen.has(item)) {
				return false;
			}
			seen.add(item);
			return true;
		});

	return [DEFAULT_DEVELOPER_MODE_VENDOR, ...configured];
};

export const isAllowedSttVendor = (
	value: string,
	env: Pick<EnvLike, "VITE_STT_VENDOR_OPTIONS">,
): value is SupportedSttVendor =>
	value !== DEFAULT_DEVELOPER_MODE_VENDOR &&
	getAllowedSttVendorsFromEnv(env).includes(value as DeveloperModeVendor);
