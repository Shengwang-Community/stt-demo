import type { DecodedSttTextMessage, SubtitleWord } from "../domain";
import { logSubtitleDebug } from "./subtitle-debug";

type JsonTranscriptResult = {
	language?: string;
	text?: string;
	isFinal?: boolean;
	offset?: number | string;
	duration?: number | string;
	sentenceId?: number | string;
};

type JsonTranscriptPayload = {
	uid?: string | number;
	language?: string;
	text?: string;
	results?: JsonTranscriptResult[];
	isFinal?: boolean;
	offset?: number | string;
	duration?: number | string;
	textTs?: number | string;
	sentenceId?: number | string;
};

type JsonTranslationResult = {
	language?: string;
	texts?: string[];
	text?: string;
	isFinal?: boolean;
	offset?: number | string;
	duration?: number | string;
	sentenceId?: number | string;
};

type JsonTranslationPayload = {
	uid?: string | number;
	isFinal?: boolean;
	offset?: number | string;
	duration?: number | string;
	textTs?: number | string;
	sentenceId?: number | string;
	original_transcript?: JsonTranscriptPayload;
	results?: JsonTranslationResult[];
};

type JsonSttPayload = {
	transcript?: JsonTranscriptPayload;
	translation?: JsonTranslationPayload;
};

const hasNonEmptyText = (value: unknown): value is string =>
	typeof value === "string" && value.length > 0;

const filterTranscriptResults = (results: JsonTranscriptResult[] | undefined) =>
	(results ?? []).filter(
		(result): result is JsonTranscriptResult & { text: string } =>
			hasNonEmptyText(result.text),
	);

const filterTranslationResults = (
	results: JsonTranslationResult[] | undefined,
) =>
	(results ?? []).filter((result) => {
		if (typeof result.language !== "string") {
			return false;
		}

		if (Array.isArray(result.texts)) {
			return result.texts.some(hasNonEmptyText);
		}

		return hasNonEmptyText(result.text);
	});

const toOptionalNumber = (value: unknown) => {
	if (value === undefined || value === null || value === "") {
		return undefined;
	}

	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : undefined;
};

const toOptionalString = (value: unknown) => {
	if (value === undefined || value === null || value === "") {
		return undefined;
	}

	return String(value);
};

const toWord = ({
	text,
	offset,
	duration,
	isFinal,
}: {
	text: string;
	offset?: number | string;
	duration?: number | string;
	isFinal: boolean;
}): SubtitleWord => ({
	text,
	startMs: toOptionalNumber(offset),
	durationMs: toOptionalNumber(duration),
	isFinal,
});

const groupBySentenceId = <T extends { sentenceId?: number | string }>(
	items: T[],
	fallbackSentenceId?: number | string,
) => {
	const groups: Array<{ sentenceId?: string; items: T[] }> = [];
	const indexBySentenceId = new Map<string, number>();

	for (const item of items) {
		const sentenceId = toOptionalString(item.sentenceId ?? fallbackSentenceId);
		const key = sentenceId ?? "__no_sentence_id__";
		const existingIndex = indexBySentenceId.get(key);
		if (existingIndex !== undefined) {
			groups[existingIndex]?.items.push(item);
			continue;
		}

		indexBySentenceId.set(key, groups.length);
		groups.push({ sentenceId, items: [item] });
	}

	return groups;
};

const decodeTranscript = (
	payload: JsonTranscriptPayload,
): DecodedSttTextMessage[] => {
	const transcriptResults = filterTranscriptResults(payload.results);
	if (transcriptResults.length === 0) {
		return [];
	}

	return groupBySentenceId(transcriptResults, payload.sentenceId).map(
		(group) => ({
			uid: String(payload.uid ?? "json-stt"),
			time: toOptionalNumber(group.items[0]?.offset ?? payload.offset),
			durationMs: toOptionalNumber(
				group.items[0]?.duration ?? payload.duration,
			),
			dataType: "transcribe",
			culture: payload.language,
			textTs: toOptionalNumber(payload.textTs),
			sentenceId: group.sentenceId,
			words: group.items.map((result) =>
				toWord({
					text: result.text,
					offset: result.offset ?? payload.offset,
					duration: result.duration ?? payload.duration,
					isFinal:
						result.isFinal === undefined
							? payload.isFinal === true
							: result.isFinal === true,
				}),
			),
			trans: [],
			payloadFormat: "json",
		}),
	);
};

const decodeTranslation = (
	payload: JsonTranslationPayload,
): DecodedSttTextMessage[] => {
	const originalTranscript = payload.original_transcript;
	const originalTranscriptResults = filterTranscriptResults(
		originalTranscript?.results,
	);
	const translations = filterTranslationResults(payload.results);

	if (
		(payload.results?.length ?? 0) === 0 ||
		(originalTranscriptResults.length === 0 && translations.length === 0)
	) {
		return [];
	}

	if (originalTranscriptResults.length === 0) {
		return groupBySentenceId(translations, payload.sentenceId).map((group) => ({
			uid: String(payload.uid ?? "json-stt"),
			time: toOptionalNumber(payload.offset),
			durationMs: toOptionalNumber(payload.duration),
			dataType: "translate",
			culture: originalTranscript?.language,
			textTs: toOptionalNumber(payload.textTs),
			sentenceId: group.sentenceId,
			words: [],
			trans: group.items.map((result) => ({
				lang: result.language ?? "",
				texts: Array.isArray(result.texts)
					? result.texts.filter(hasNonEmptyText)
					: typeof result.text === "string"
						? [result.text]
						: [],
				isFinal:
					result.isFinal === undefined
						? payload.isFinal === true
						: result.isFinal === true,
			})),
			payloadFormat: "json",
		}));
	}

	const entries = originalTranscriptResults.map((result, index) => ({
		result,
		translation: translations[index],
		sentenceId:
			result.sentenceId ??
			translations[index]?.sentenceId ??
			payload.sentenceId,
	}));
	const groupedEntries = groupBySentenceId(entries, payload.sentenceId);

	return groupedEntries.map((group) => {
		const groupedOriginalResults = group.items.map((item) => item.result);
		const groupedTranslations = group.items
			.map((item) => item.translation)
			.filter(
				(translation): translation is JsonTranslationResult =>
					translation !== undefined,
			);

		return {
			uid: String(payload.uid ?? "json-stt"),
			time: toOptionalNumber(
				groupedOriginalResults[0]?.offset ??
					originalTranscript?.offset ??
					payload.offset,
			),
			durationMs: toOptionalNumber(
				groupedOriginalResults[0]?.duration ??
					originalTranscript?.duration ??
					payload.duration,
			),
			dataType: "translate",
			culture: originalTranscript?.language,
			textTs: toOptionalNumber(payload.textTs),
			sentenceId: group.sentenceId,
			words: [],
			trans: groupedTranslations.map((result) => ({
				lang: result.language ?? "",
				texts: Array.isArray(result.texts)
					? result.texts.filter(hasNonEmptyText)
					: typeof result.text === "string"
						? [result.text]
						: [],
				isFinal:
					result.isFinal === undefined
						? payload.isFinal === true
						: result.isFinal === true,
			})),
			originalTranscript:
				groupedOriginalResults.length > 0
					? {
							culture: originalTranscript?.language,
							words: groupedOriginalResults.map((result) =>
								toWord({
									text: result.text,
									offset:
										result.offset ??
										originalTranscript?.offset ??
										payload.offset,
									duration:
										result.duration ??
										originalTranscript?.duration ??
										payload.duration,
									isFinal:
										result.isFinal === undefined
											? payload.isFinal === true
											: result.isFinal === true,
								}),
							),
						}
					: undefined,
			alignedOriginalTranscript:
				groupedOriginalResults.length > 0
					? {
							culture: originalTranscript?.language,
							words: groupedOriginalResults.map((result) =>
								toWord({
									text: result.text,
									offset: result.offset,
									duration: result.duration,
									isFinal: result.isFinal === true,
								}),
							),
						}
					: undefined,
			payloadFormat: "json",
		};
	});
};

export const decodeJsonSttMessage = (
	stream: Uint8Array,
): DecodedSttTextMessage[] => {
	const rawText = new TextDecoder().decode(stream);
	const payload = JSON.parse(rawText) as JsonSttPayload;

	if (payload.transcript) {
		logSubtitleDebug("decoded json payload transcribe", payload);
		return decodeTranscript(payload.transcript);
	}

	if (payload.translation) {
		logSubtitleDebug("decoded json payload translate", payload);
		return decodeTranslation(payload.translation);
	}

	return [];
};
