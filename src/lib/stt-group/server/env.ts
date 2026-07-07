import { DEFAULT_STT_MAX_IDLE_TIME_SECONDS } from "../domain";

export type EnvLike = Record<string, string | undefined>;

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

export type AgoraRuntimeConfig = {
	appId: string;
	appCertificate: string;
	usesDynamicToken: boolean;
};

export type CaptionStorageProvider = "aliyun" | "aws";

export type CaptionStorageConfig = {
	provider: CaptionStorageProvider;
	regionCode: number;
	regionName: string;
	bucket: string;
	accessKey: string;
	secretKey: string;
	prefixRoot: string;
	sliceDuration: number;
};

export type AgoraServerConfig = {
	appId: string;
	appCertificate: string;
	usesDynamicToken: boolean;
	sttRestBasicAuth?: string;
	sttRestAuthKey: string;
	sttRestAuthSecret: string;
	sttRestBaseUrl: string;
	sttKeywords: string[];
	sttGraphId?: string;
	sttForceTranslateIntervalSeconds: number;
	subBotUid: string;
	pubBotUid: string;
	maxIdleTimeSeconds: number;
	captionStorage?: CaptionStorageConfig;
	requestHeaders?: Record<string, string>;
};

export type MobileViewerServerConfig = {
	tokenSecret: string;
	tokenMaxAgeSeconds: number;
};

const parseCsv = (value: string | undefined) =>
	(value ?? "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);

const parseNumber = (value: string | undefined, fallback: number) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const requireTrimmed = (value: string | undefined, name: string) => {
	const trimmed = value?.trim() ?? "";
	if (!trimmed) {
		throw new Error(`${name} is not configured`);
	}
	return trimmed;
};

const hasTrimmedValue = (value: string | undefined) => Boolean(value?.trim());

const assertNumberString = (value: string, name: string) => {
	if (!/^\d+$/.test(value)) {
		throw new Error(`${name} must be a numeric string`);
	}

	return value;
};

const buildAgoraRuntimeConfig = (
	appId: string,
	appCertificate: string,
	errorMessage: string,
): AgoraRuntimeConfig => {
	if (!appId) {
		throw new Error(errorMessage);
	}

	return {
		appId,
		appCertificate,
		usesDynamicToken: Boolean(appCertificate),
	};
};

const parseCaptionStorageProvider = (
	value: string | undefined,
): CaptionStorageProvider => {
	const provider = value?.trim();
	if (provider === "aliyun" || provider === "aws") {
		return provider;
	}

	throw new Error(
		'AGORA_STT_CAPTION_PROVIDER must be either "aliyun" or "aws"',
	);
};

const CAPTION_REGION_CODES = {
	aws: {
		"0": 0,
		"1": 1,
		"2": 2,
		"3": 3,
		"4": 4,
		"5": 5,
		"6": 6,
		"7": 7,
		"8": 8,
		"9": 9,
		"10": 10,
		"11": 11,
		"12": 12,
		"13": 13,
		"14": 14,
		"15": 15,
		"16": 16,
		"18": 18,
		"19": 19,
		"20": 20,
		"21": 21,
		"22": 22,
		"24": 24,
		"25": 25,
		US_EAST_1: 0,
		US_EAST_2: 1,
		US_WEST_1: 2,
		US_WEST_2: 3,
		EU_WEST_1: 4,
		EU_WEST_2: 5,
		EU_WEST_3: 6,
		EU_CENTRAL_1: 7,
		AP_SOUTHEAST_1: 8,
		AP_SOUTHEAST_2: 9,
		AP_NORTHEAST_1: 10,
		AP_NORTHEAST_2: 11,
		SA_EAST_1: 12,
		CA_CENTRAL_1: 13,
		AP_SOUTH_1: 14,
		CN_NORTH_1: 15,
		CN_NORTHWEST_1: 16,
		AF_SOUTH_1: 18,
		AP_EAST_1: 19,
		AP_NORTHEAST_3: 20,
		EU_NORTH_1: 21,
		ME_SOUTH_1: 22,
		AP_SOUTHEAST_3: 24,
		EU_SOUTH_1: 25,
	},
	aliyun: {
		"0": 0,
		"1": 1,
		"2": 2,
		"3": 3,
		"4": 4,
		"5": 5,
		"6": 6,
		"7": 7,
		"8": 8,
		"9": 9,
		"10": 10,
		"11": 11,
		"12": 12,
		"13": 13,
		"14": 14,
		"15": 15,
		"16": 16,
		"17": 17,
		"18": 18,
		"19": 19,
		"20": 20,
		"21": 21,
		"22": 22,
		"23": 23,
		"24": 24,
		"25": 25,
		"26": 26,
		"27": 27,
		CN_HANGZHOU: 0,
		CN_SHANGHAI: 1,
		CN_QINGDAO: 2,
		CN_BEIJING: 3,
		CN_ZHANGJIAKOU: 4,
		CN_HUHEHAOTE: 5,
		CN_SHENZHEN: 6,
		CN_HONGKONG: 7,
		US_WEST_1: 8,
		US_EAST_1: 9,
		AP_SOUTHEAST_1: 10,
		AP_SOUTHEAST_2: 11,
		AP_SOUTHEAST_3: 12,
		AP_SOUTHEAST_5: 13,
		AP_NORTHEAST_1: 14,
		AP_SOUTH_1: 15,
		EU_CENTRAL_1: 16,
		EU_WEST_1: 17,
		EU_EAST_1: 18,
		AP_SOUTHEAST_6: 19,
		CN_HEYUAN: 20,
		CN_GUANGZHOU: 21,
		CN_CHENGDU: 22,
		CN_NANJING: 23,
		CN_FUZHOU: 24,
		CN_WULANCHABU: 25,
		CN_NORTHEAST_2: 26,
		CN_SOUTHEAST_7: 27,
		"cn-hangzhou": 0,
		"cn-shanghai": 1,
		"cn-qingdao": 2,
		"cn-beijing": 3,
		"cn-zhangjiakou": 4,
		"cn-huhehaote": 5,
		"cn-shenzhen": 6,
		"cn-hongkong": 7,
		"us-west-1": 8,
		"us-east-1": 9,
		"ap-southeast-1": 10,
		"ap-southeast-2": 11,
		"ap-southeast-3": 12,
		"ap-southeast-5": 13,
		"ap-northeast-1": 14,
		"ap-south-1": 15,
		"eu-central-1": 16,
		"eu-west-1": 17,
		"eu-east-1": 18,
		"ap-southeast-6": 19,
		"cn-heyuan": 20,
		"cn-guangzhou": 21,
		"cn-chengdu": 22,
		"cn-nanjing": 23,
		"cn-fuzhou": 24,
		"cn-wulanchabu": 25,
		"cn-northeast-2": 26,
		"cn-southeast-7": 27,
		"oss-cn-hangzhou": 0,
		"oss-cn-shanghai": 1,
		"oss-cn-qingdao": 2,
		"oss-cn-beijing": 3,
		"oss-cn-zhangjiakou": 4,
		"oss-cn-huhehaote": 5,
		"oss-cn-shenzhen": 6,
		"oss-cn-hongkong": 7,
		"oss-us-west-1": 8,
		"oss-us-east-1": 9,
		"oss-ap-southeast-1": 10,
		"oss-ap-southeast-2": 11,
		"oss-ap-southeast-3": 12,
		"oss-ap-southeast-5": 13,
		"oss-ap-northeast-1": 14,
		"oss-ap-south-1": 15,
		"oss-eu-central-1": 16,
		"oss-eu-west-1": 17,
		"oss-eu-east-1": 18,
		"oss-ap-southeast-6": 19,
	},
} as const;

const CAPTION_REGION_NAMES = {
	aws: {
		0: "us-east-1",
		1: "us-east-2",
		2: "us-west-1",
		3: "us-west-2",
		4: "eu-west-1",
		5: "eu-west-2",
		6: "eu-west-3",
		7: "eu-central-1",
		8: "ap-southeast-1",
		9: "ap-southeast-2",
		10: "ap-northeast-1",
		11: "ap-northeast-2",
		12: "sa-east-1",
		13: "ca-central-1",
		14: "ap-south-1",
		15: "cn-north-1",
		16: "cn-northwest-1",
		18: "af-south-1",
		19: "ap-east-1",
		20: "ap-northeast-3",
		21: "eu-north-1",
		22: "me-south-1",
		24: "ap-southeast-3",
		25: "eu-south-1",
	},
	aliyun: {
		0: "oss-cn-hangzhou",
		1: "oss-cn-shanghai",
		2: "oss-cn-qingdao",
		3: "oss-cn-beijing",
		4: "oss-cn-zhangjiakou",
		5: "oss-cn-huhehaote",
		6: "oss-cn-shenzhen",
		7: "oss-cn-hongkong",
		8: "oss-us-west-1",
		9: "oss-us-east-1",
		10: "oss-ap-southeast-1",
		11: "oss-ap-southeast-2",
		12: "oss-ap-southeast-3",
		13: "oss-ap-southeast-5",
		14: "oss-ap-northeast-1",
		15: "oss-ap-south-1",
		16: "oss-eu-central-1",
		17: "oss-eu-west-1",
		18: "oss-eu-east-1",
		19: "oss-ap-southeast-6",
		20: "oss-cn-heyuan",
		21: "oss-cn-guangzhou",
		22: "oss-cn-chengdu",
		23: "oss-cn-nanjing",
		24: "oss-cn-fuzhou",
		25: "oss-cn-wulanchabu",
		26: "oss-cn-northeast-2",
		27: "oss-cn-southeast-7",
	},
} as const;

const parseCaptionStorageRegion = ({
	provider,
	value,
}: {
	provider: CaptionStorageProvider;
	value: string | undefined;
}) => {
	const raw = requireTrimmed(value, "AGORA_STT_CAPTION_REGION");
	const normalized = raw.trim();
	const mapped =
		CAPTION_REGION_CODES[provider][
			normalized as keyof (typeof CAPTION_REGION_CODES)[typeof provider]
		] ??
		CAPTION_REGION_CODES[provider][
			normalized.toUpperCase() as keyof (typeof CAPTION_REGION_CODES)[typeof provider]
		];

	if (mapped !== undefined) {
		return mapped;
	}

	const parsed = Number(normalized);
	if (Number.isInteger(parsed) && parsed >= 0) {
		return parsed;
	}

	throw new Error(
		`AGORA_STT_CAPTION_REGION is not a supported ${provider} region code`,
	);
};

const resolveCaptionStorageRegionName = ({
	provider,
	regionCode,
}: {
	provider: CaptionStorageProvider;
	regionCode: number;
}) => {
	const regionName =
		CAPTION_REGION_NAMES[provider][
			regionCode as keyof (typeof CAPTION_REGION_NAMES)[typeof provider]
		];

	if (regionName) {
		return regionName;
	}

	throw new Error(
		`AGORA_STT_CAPTION_REGION is not mapped to a ${provider} SDK region name`,
	);
};

const resolveRtcAgoraConfig = (env: EnvLike): AgoraRuntimeConfig =>
	buildAgoraRuntimeConfig(
		env.VITE_AGORA_RTC_APP_ID ?? "",
		env.AGORA_RTC_APP_CERTIFICATE ?? "",
		"RTC Agora App ID is not configured",
	);

const resolveRtmAgoraConfig = (env: EnvLike): AgoraRuntimeConfig =>
	buildAgoraRuntimeConfig(
		env.VITE_AGORA_RTM_APP_ID ?? "",
		env.AGORA_RTM_APP_CERTIFICATE ?? "",
		"RTM Agora App ID is not configured",
	);

const getCaptionStorageConfig = (env: EnvLike): CaptionStorageConfig => {
	const provider = parseCaptionStorageProvider(env.AGORA_STT_CAPTION_PROVIDER);
	const regionCode = parseCaptionStorageRegion({
		provider,
		value: env.AGORA_STT_CAPTION_REGION,
	});

	return {
		provider,
		regionCode,
		regionName: resolveCaptionStorageRegionName({
			provider,
			regionCode,
		}),
		bucket: requireTrimmed(
			env.AGORA_STT_CAPTION_BUCKET,
			"AGORA_STT_CAPTION_BUCKET",
		),
		accessKey: requireTrimmed(
			env.AGORA_STT_CAPTION_ACCESS_KEY,
			"AGORA_STT_CAPTION_ACCESS_KEY",
		),
		secretKey: requireTrimmed(
			env.AGORA_STT_CAPTION_SECRET_KEY,
			"AGORA_STT_CAPTION_SECRET_KEY",
		),
		prefixRoot: requireTrimmed(
			env.AGORA_STT_CAPTION_PREFIX_ROOT,
			"AGORA_STT_CAPTION_PREFIX_ROOT",
		).replace(/^\/+|\/+$/g, ""),
		sliceDuration: parseNumber(env.AGORA_STT_CAPTION_SLICE_DURATION, 300),
	};
};

const CAPTION_STORAGE_REQUIRED_ENV = [
	"AGORA_STT_CAPTION_PROVIDER",
	"AGORA_STT_CAPTION_REGION",
	"AGORA_STT_CAPTION_BUCKET",
	"AGORA_STT_CAPTION_ACCESS_KEY",
	"AGORA_STT_CAPTION_SECRET_KEY",
	"AGORA_STT_CAPTION_PREFIX_ROOT",
] as const;

const getOptionalCaptionStorageConfig = (
	env: EnvLike,
): CaptionStorageConfig | undefined => {
	const presentKeys = CAPTION_STORAGE_REQUIRED_ENV.filter((key) =>
		hasTrimmedValue(env[key]),
	);

	if (presentKeys.length === 0) {
		return undefined;
	}

	if (presentKeys.length !== CAPTION_STORAGE_REQUIRED_ENV.length) {
		const missingKeys = CAPTION_STORAGE_REQUIRED_ENV.filter(
			(key) => !hasTrimmedValue(env[key]),
		);
		throw new Error(
			`STT caption storage is partially configured; missing ${missingKeys.join(
				", ",
			)}`,
		);
	}

	return getCaptionStorageConfig(env);
};

export const getRtcAgoraTokenConfig = (env: EnvLike = process.env) =>
	resolveRtcAgoraConfig(env);

export const getRtmAgoraTokenConfig = (env: EnvLike = process.env) =>
	resolveRtmAgoraConfig(env);

export const getAgoraServerConfig = (
	env: EnvLike = process.env,
): AgoraServerConfig => {
	const rtcConfig = resolveRtcAgoraConfig(env);
	const sttRestBasicAuth = env.AGORA_STT_BASIC_AUTH?.trim();
	const sttRestAuthKey = env.AGORA_CUSTOMER_KEY || rtcConfig.appId;
	const sttRestAuthSecret =
		env.AGORA_CUSTOMER_SECRET || rtcConfig.appCertificate;

	return {
		...rtcConfig,
		sttRestBasicAuth: sttRestBasicAuth || undefined,
		sttRestAuthKey,
		sttRestAuthSecret,
		sttRestBaseUrl: trimTrailingSlashes(
			env.AGORA_STT_REST_BASE_URL ??
				"https://api.sd-rtn.com/cn/api/speech-to-text/v1",
		),
		sttKeywords: parseCsv(env.AGORA_STT_KEYWORDS ?? "声网,Agora,实时互动"),
		sttGraphId: env.AGORA_STT_GRAPH_ID || undefined,
		sttForceTranslateIntervalSeconds: parseNumber(
			env.AGORA_STT_FORCE_TRANSLATE_INTERVAL_SECONDS,
			2,
		),
		subBotUid: assertNumberString(
			env.AGORA_STT_SUB_BOT_UID ?? "1000",
			"AGORA_STT_SUB_BOT_UID",
		),
		pubBotUid: assertNumberString(
			env.AGORA_STT_PUB_BOT_UID ?? "2000",
			"AGORA_STT_PUB_BOT_UID",
		),
		maxIdleTimeSeconds: Number(
			env.AGORA_STT_MAX_IDLE_TIME_SECONDS ??
				String(DEFAULT_STT_MAX_IDLE_TIME_SECONDS),
		),
		captionStorage: getOptionalCaptionStorageConfig(env),
	};
};

export const getMobileViewerServerConfig = (
	env: EnvLike = process.env,
): MobileViewerServerConfig => {
	const tokenSecret = env.MOBILE_VIEWER_TOKEN_SECRET?.trim() ?? "";

	if (!tokenSecret) {
		throw new Error("MOBILE_VIEWER_TOKEN_SECRET is not configured");
	}

	return {
		tokenSecret,
		tokenMaxAgeSeconds: parseNumber(
			env.MOBILE_VIEWER_TOKEN_MAX_AGE_SECONDS,
			10 * 60,
		),
	};
};
