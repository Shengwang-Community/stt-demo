import {
	GetObjectCommand,
	ListObjectsV2Command,
	NoSuchKey,
	S3Client,
} from "@aws-sdk/client-s3";
import OSS from "ali-oss";
import { Readable } from "node:stream";
import type { CaptionStorageConfig, CaptionStorageProvider } from "./env";

export type CaptionFileType = "source" | "target";

export class CaptionFileNotFoundError extends Error {
	constructor() {
		super("当前还没有可下载的 VTT 文件");
	}
}

export type CaptionDownloadItem = {
	key: string;
	filename: string;
};

export const mapCaptionProviderToShengwangVendor = (
	provider: CaptionStorageProvider,
) => (provider === "aws" ? 1 : 2);

const sanitizeCaptionSegment = (value: string) =>
	value.replace(/[^A-Za-z0-9]/g, "").slice(0, 48);

const requireCaptionSegment = (value: string, fallback: string) =>
	sanitizeCaptionSegment(value) || fallback;

export const buildCaptionPrefixSegments = ({
	prefixRoot,
	channelName,
	sessionId,
}: {
	prefixRoot: string;
	channelName: string;
	sessionId: string;
}) => [
	...prefixRoot
		.split("/")
		.map((segment) => sanitizeCaptionSegment(segment))
		.filter(Boolean),
	requireCaptionSegment(channelName, "channel"),
	requireCaptionSegment(sessionId, "session"),
];

export const buildCaptionFileNamePrefix = ({
	prefixRoot,
	channelName,
	sessionId,
}: {
	prefixRoot: string;
	channelName: string;
	sessionId: string;
}) => buildCaptionPrefixSegments({ prefixRoot, channelName, sessionId }).join("/");

export const buildCaptionObjectKey = ({
	fileNamePrefix,
	type,
}: {
	fileNamePrefix: string;
	type: CaptionFileType;
}) => `${fileNamePrefix}/${type}.vtt`;

export const buildCaptionFileNamePrefixList = ({
	prefixRoot,
	channelName,
	sessionId,
}: {
	prefixRoot: string;
	channelName: string;
	sessionId: string;
}) => buildCaptionPrefixSegments({ prefixRoot, channelName, sessionId });

const streamToBuffer = async (stream: unknown): Promise<Buffer> => {
	if (stream instanceof Readable) {
		const chunks: Buffer[] = [];
		for await (const chunk of stream) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
		}
		return Buffer.concat(chunks);
	}

	if (stream instanceof Uint8Array) {
		return Buffer.from(stream);
	}

	if (stream && typeof stream === "object" && "transformToByteArray" in stream) {
		const bytes = await (
			stream as { transformToByteArray: () => Promise<Uint8Array> }
		).transformToByteArray();
		return Buffer.from(bytes);
	}

	throw new Error("Unsupported caption file stream");
};

const collectAliyunKeys = async ({
	config,
	prefix,
}: {
	config: CaptionStorageConfig;
	prefix: string;
}) => {
	const client = new OSS({
		region: config.regionName,
		bucket: config.bucket,
		accessKeyId: config.accessKey,
		accessKeySecret: config.secretKey,
	});

	const keys: string[] = [];
	let marker: string | undefined;

	do {
		const result = await client.listV2({
			prefix: `${prefix}/`,
			"max-keys": 1000,
			continuationToken: marker,
		});
		for (const object of result.objects ?? []) {
			if (object.name) {
				keys.push(object.name);
			}
		}
		marker = result.nextContinuationToken;
	} while (marker);

	return keys;
};

const collectAwsKeys = async ({
	config,
	prefix,
}: {
	config: CaptionStorageConfig;
	prefix: string;
}) => {
	const client = new S3Client({
		region: config.regionName,
		credentials: {
			accessKeyId: config.accessKey,
			secretAccessKey: config.secretKey,
		},
	});

	const keys: string[] = [];
	let continuationToken: string | undefined;

	do {
		const response = await client.send(
			new ListObjectsV2Command({
				Bucket: config.bucket,
				Prefix: `${prefix}/`,
				ContinuationToken: continuationToken,
			}),
		);
		for (const item of response.Contents ?? []) {
			if (item.Key) {
				keys.push(item.Key);
			}
		}
		continuationToken = response.NextContinuationToken;
	} while (continuationToken);

	return keys;
};

const buildCaptionFilenameMatcher = ({
	type,
	targetLanguage,
}: {
	type: CaptionFileType;
	targetLanguage?: string;
}) => {
	if (type === "source") {
		return (filename: string) =>
			filename.endsWith(".vtt") &&
			!filename.startsWith("en-US_") &&
			!filename.startsWith("zh-CN_");
	}

	return (filename: string) =>
		filename.endsWith(".vtt") &&
		Boolean(targetLanguage) &&
		filename.startsWith(`${targetLanguage}_`);
};

const downloadFromAliyun = async ({
	config,
	key,
}: {
	config: CaptionStorageConfig;
	key: string;
}) => {
	const client = new OSS({
		region: config.regionName,
		bucket: config.bucket,
		accessKeyId: config.accessKey,
		accessKeySecret: config.secretKey,
	});

	try {
		const result = await client.get(key);
		if (Buffer.isBuffer(result.content)) {
			return result.content;
		}
		if (typeof result.content === "string") {
			return Buffer.from(result.content);
		}
		if (result.content instanceof ArrayBuffer) {
			return Buffer.from(result.content);
		}
		if (ArrayBuffer.isView(result.content)) {
			return Buffer.from(result.content.buffer);
		}
		throw new Error("Unsupported Aliyun OSS content response");
	} catch (error) {
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "NoSuchKey"
		) {
			throw new CaptionFileNotFoundError();
		}
		throw error;
	}
};

const downloadFromAws = async ({
	config,
	key,
}: {
	config: CaptionStorageConfig;
	key: string;
}) => {
	const client = new S3Client({
		region: config.regionName,
		credentials: {
			accessKeyId: config.accessKey,
			secretAccessKey: config.secretKey,
		},
	});

	try {
		const response = await client.send(
			new GetObjectCommand({
				Bucket: config.bucket,
				Key: key,
			}),
		);
		return await streamToBuffer(response.Body);
	} catch (error) {
		if (error instanceof NoSuchKey) {
			throw new CaptionFileNotFoundError();
		}
		if (
			error &&
			typeof error === "object" &&
			"Code" in error &&
			error.Code === "NoSuchKey"
		) {
			throw new CaptionFileNotFoundError();
		}
		throw error;
	}
};

export const downloadCaptionObject = async ({
	config,
	channelName,
	sessionId,
	type,
	key,
}: {
	config: CaptionStorageConfig;
	channelName: string;
	sessionId: string;
	type: CaptionFileType;
	key?: string;
}) => {
	const resolvedKey =
		key ??
		buildCaptionObjectKey({
			fileNamePrefix: buildCaptionFileNamePrefix({
				prefixRoot: config.prefixRoot,
				channelName,
				sessionId,
			}),
			type,
		});

	if (config.provider === "aliyun") {
		return downloadFromAliyun({ config, key: resolvedKey });
	}

	return downloadFromAws({ config, key: resolvedKey });
};

export const listCaptionDownloadItems = async ({
	config,
	channelName,
	sessionId,
	type,
	targetLanguage,
}: {
	config: CaptionStorageConfig;
	channelName: string;
	sessionId: string;
	type: CaptionFileType;
	targetLanguage?: string;
}) => {
	const fileNamePrefix = buildCaptionFileNamePrefix({
		prefixRoot: config.prefixRoot,
		channelName,
		sessionId,
	});
	const keys =
		config.provider === "aliyun"
			? await collectAliyunKeys({ config, prefix: fileNamePrefix })
			: await collectAwsKeys({ config, prefix: fileNamePrefix });
	console.log(
		`[DEBUG-vtt-path] provider=${config.provider} prefix=${fileNamePrefix} type=${type} targetLanguage=${targetLanguage ?? ""} keys=${JSON.stringify(keys)}`,
	);
	const match = buildCaptionFilenameMatcher({ type, targetLanguage });
	const items = keys
		.map((key) => ({
			key,
			filename: key.split("/").at(-1) ?? key,
		}))
		.filter((item) => match(item.filename))
		.sort((left, right) => left.filename.localeCompare(right.filename));
	console.log(
		`[DEBUG-vtt-path] matched=${JSON.stringify(items.map((item) => item.key))}`,
	);

	if (items.length === 0) {
		throw new CaptionFileNotFoundError();
	}

	return items;
};
