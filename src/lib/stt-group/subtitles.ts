import type { SubtitleRenderMode } from "#/lib/developer-mode/types";
import type {
	DecodedSttTextMessage,
	SubtitleLine,
	SubtitleLineFragment,
	SubtitleLineTranslationFragment,
	SubtitleWord,
} from "./domain";

export type SubtitleHistoryEntry = {
	id: string;
	speakerUid: string;
	sentenceId?: string;
	updatedAt: number;
	sourceText?: string;
	targetTexts: Record<string, string>;
	sourceFragments?: SubtitleLineFragment[];
	targetTextFragments?: Record<string, SubtitleLineTranslationFragment[]>;
};

const joinWords = (words: Array<{ text: string }>) =>
	words.map((word) => word.text).join("");

const getLineId = (message: DecodedSttTextMessage) => {
	if (message.sentenceId) {
		return `sentence:${message.sentenceId}`;
	}

	if (message.textTs !== undefined) {
		return `text-ts:${message.uid}:${message.textTs}`;
	}

	if (message.time !== undefined) {
		return `time:${message.uid}:${message.time}`;
	}

	return `live:${message.uid}`;
};

const getAlignedLineId = (message: DecodedSttTextMessage) => {
	if (message.sentenceId) {
		return `sentence:${message.sentenceId}`;
	}

	if (message.textTs !== undefined) {
		return `text-ts:${message.uid}:${message.textTs}`;
	}

	if (message.time !== undefined) {
		return `time:${message.uid}:${message.time}`;
	}

	return `translate:${message.uid}`;
};

const getFragmentKey = (speakerUid: string, startMs?: number) =>
	startMs === undefined ? undefined : `${speakerUid}:${startMs}`;

const isFinalWords = (words: Array<{ isFinal: boolean }>) =>
	words.length > 0 && words.every((word) => word.isFinal);

const toSourceFragment = (
	message: DecodedSttTextMessage,
	word: SubtitleWord,
	now: number,
): SubtitleLine | null => {
	const fragmentKey = getFragmentKey(message.uid, word.startMs);
	if (!fragmentKey || !word.text) {
		return null;
	}

	return {
		id: fragmentKey,
		speakerUid: message.uid,
		sentenceId: message.sentenceId,
		sourceLanguage: message.culture,
		sourceText: word.text,
		targetTexts: {},
		isFinal: Boolean(word.isFinal),
		startedAt: message.time,
		updatedAt: now,
		sourceVersionTextTs: message.textTs,
		targetVersionTextTs: {},
		sourceFragments: [
			{
				fragmentKey,
				text: word.text,
				isFinal: Boolean(word.isFinal),
			},
		],
		targetTextFragments: {},
		currentTailFragmentKey: word.isFinal ? undefined : fragmentKey,
	};
};

const mergeTextFragments = (
	existing: SubtitleLineTranslationFragment[] | undefined,
	nextFragment: SubtitleLineTranslationFragment,
) => [
	...(existing ?? []).filter(
		(fragment) => fragment.fragmentKey !== nextFragment.fragmentKey,
	),
	nextFragment,
];

const joinTextFragments = (
	fragments: SubtitleLineTranslationFragment[] | undefined,
) => (fragments ?? []).map((fragment) => fragment.text).join("");

const upsertLineById = (lines: SubtitleLine[], nextLine: SubtitleLine) => {
	const existingIndex = lines.findIndex((line) => line.id === nextLine.id);
	if (existingIndex === -1) {
		return [...lines, nextLine];
	}

	return lines.map((line, index) =>
		index === existingIndex ? nextLine : line,
	);
};

const mergeSourceUpdateIntoExistingLine = ({
	existingLine,
	nextLine,
	fragmentKey,
}: {
	existingLine?: SubtitleLine;
	nextLine: SubtitleLine;
	fragmentKey?: string;
}): SubtitleLine =>
	existingLine
		? {
				...nextLine,
				targetTexts:
					fragmentKey === undefined
						? existingLine.targetTexts
						: Object.fromEntries(
								Object.entries(existingLine.targetTextFragments ?? {})
									.map(([language, fragments]) => {
										const matchedFragments = fragments.filter(
											(fragment) => fragment.fragmentKey === fragmentKey,
										);
										if (matchedFragments.length === 0) {
											return null;
										}
										return [
											language,
											matchedFragments
												.map((fragment) => fragment.text)
												.join(""),
										];
									})
									.filter((entry): entry is [string, string] => entry !== null),
							),
				targetVersionTextTs:
					fragmentKey === undefined
						? existingLine.targetVersionTextTs
						: Object.fromEntries(
								Object.entries(existingLine.targetTextFragments ?? {})
									.map(([language, fragments]) => {
										const hasMatchedFragment = fragments.some(
											(fragment) => fragment.fragmentKey === fragmentKey,
										);
										if (!hasMatchedFragment) {
											return null;
										}
										return [
											language,
											existingLine.targetVersionTextTs?.[language],
										];
									})
									.filter(
										(entry): entry is [string, number | undefined] =>
											entry !== null,
									),
							),
				targetTextFragments:
					fragmentKey === undefined
						? existingLine.targetTextFragments
						: Object.fromEntries(
								Object.entries(existingLine.targetTextFragments ?? {})
									.map(([language, fragments]) => {
										const matchedFragments = fragments.filter(
											(fragment) => fragment.fragmentKey === fragmentKey,
										);
										if (matchedFragments.length === 0) {
											return null;
										}
										return [language, matchedFragments];
									})
									.filter(
										(
											entry,
										): entry is [string, SubtitleLineTranslationFragment[]] =>
											entry !== null,
									),
							),
			}
		: nextLine;

const applySingleMessageFallback = (
	lines: SubtitleLine[],
	message: DecodedSttTextMessage,
	now: number,
) => {
	const id = getLineId(message);
	const existing = lines.find((line) => line.id === id);
	const sourceText =
		message.originalTranscript?.words.length && message.dataType === "translate"
			? joinWords(message.originalTranscript.words)
			: joinWords(message.words);
	const targetTexts = {
		...(existing?.targetTexts ?? {}),
	};

	for (const translation of message.trans) {
		const text = translation.texts.join("");
		if (translation.lang && text) {
			targetTexts[translation.lang] = text;
		}
	}

	const messageIsFinal =
		message.dataType === "translate"
			? message.trans.some((translation) => translation.isFinal)
			: isFinalWords(message.words);

	const nextLine: SubtitleLine = {
		id,
		speakerUid: message.uid,
		sentenceId: message.sentenceId ?? existing?.sentenceId,
		sourceLanguage:
			message.originalTranscript?.culture ??
			message.culture ??
			existing?.sourceLanguage,
		sourceText: sourceText || existing?.sourceText || "",
		targetTexts,
		isFinal: existing?.isFinal ? true : messageIsFinal,
		startedAt: message.time ?? existing?.startedAt,
		updatedAt: now,
		sourceVersionTextTs:
			message.dataType === "translate"
				? existing?.sourceVersionTextTs
				: (message.textTs ?? existing?.sourceVersionTextTs),
		targetVersionTextTs:
			message.dataType === "translate"
				? Object.fromEntries(
						Object.keys(targetTexts).map((language) => [
							language,
							message.textTs ?? existing?.targetVersionTextTs?.[language],
						]),
					)
				: existing?.targetVersionTextTs,
		sourceFragments: sourceText
			? [
					{
						fragmentKey: id,
						text: sourceText,
						isFinal: messageIsFinal,
					},
				]
			: existing?.sourceFragments,
		targetTextFragments:
			Object.keys(targetTexts).length > 0
				? Object.fromEntries(
						Object.entries(targetTexts).map(([language, text]) => [
							language,
							[
								{
									fragmentKey: id,
									text,
									isFinal: messageIsFinal,
								},
							],
						]),
					)
				: existing?.targetTextFragments,
		currentTailFragmentKey: messageIsFinal ? undefined : id,
	};

	if (!existing) {
		return [...lines, nextLine].slice(-200);
	}

	return lines.map((line) => (line.id === id ? nextLine : line));
};

const isMixedTranscribeMessage = (message: DecodedSttTextMessage) =>
	message.dataType === "transcribe" &&
	message.words.length === 2 &&
	Boolean(message.words[0]?.isFinal) &&
	Boolean(message.words[1]) &&
	!message.words[1]?.isFinal;

const isSingleFinalFragmentMessage = (message: DecodedSttTextMessage) =>
	message.dataType === "transcribe" &&
	message.words.length === 1 &&
	Boolean(message.words[0]?.isFinal) &&
	Boolean(message.words[0]?.startMs);

const isSingleTailContinuationMessage = (message: DecodedSttTextMessage) =>
	message.dataType === "transcribe" &&
	message.words.length === 1 &&
	Boolean(message.words[0]?.startMs) &&
	!message.words[0]?.isFinal;

const isMixedTranslateMessage = (message: DecodedSttTextMessage) =>
	message.dataType === "translate" &&
	(message.originalTranscript?.words.length ?? 0) === 2 &&
	Boolean(message.originalTranscript?.words[0]?.isFinal) &&
	Boolean(message.originalTranscript?.words[1]) &&
	!message.originalTranscript?.words[1]?.isFinal;

const isSingleTranslateFragmentMessage = (message: DecodedSttTextMessage) =>
	message.dataType === "translate" &&
	(message.originalTranscript?.words.length ?? 0) === 1 &&
	Boolean(message.originalTranscript?.words[0]?.startMs);

const createMixedCurrentLine = ({
	message,
	stableLine,
	tailLine,
	now,
}: {
	message: DecodedSttTextMessage;
	stableLine: SubtitleLine;
	tailLine: SubtitleLine;
	now: number;
}): SubtitleLine => {
	const stableFragment = stableLine.sourceFragments?.[0];
	const tailFragment = tailLine.sourceFragments?.[0];
	const sourceFragments = [
		...(stableFragment ? [stableFragment] : []),
		...(tailFragment ? [tailFragment] : []),
	];
	const targetTextFragments: Record<string, SubtitleLineTranslationFragment[]> =
		{};
	const targetTexts: Record<string, string> = {};

	for (const language of new Set([
		...Object.keys(stableLine.targetTexts),
		...Object.keys(tailLine.targetTexts),
	])) {
		const stableTranslation = stableLine.targetTextFragments?.[language]?.[0];
		const tailTranslation = tailLine.targetTextFragments?.[language]?.[0];
		const fragments = [
			...(stableTranslation ? [stableTranslation] : []),
			...(tailTranslation ? [tailTranslation] : []),
		];
		if (fragments.length > 0) {
			targetTextFragments[language] = fragments;
			targetTexts[language] = fragments
				.map((fragment) => fragment.text)
				.join("");
		}
	}

	return {
		id: tailLine.id,
		speakerUid: message.uid,
		sentenceId:
			message.sentenceId ?? tailLine.sentenceId ?? stableLine.sentenceId,
		sourceLanguage:
			tailLine.sourceLanguage ?? stableLine.sourceLanguage ?? message.culture,
		sourceText: sourceFragments.map((fragment) => fragment.text).join(""),
		targetTexts,
		isFinal: false,
		startedAt: tailLine.startedAt ?? stableLine.startedAt ?? message.time,
		updatedAt: now,
		sourceFragments,
		targetTextFragments,
		currentTailFragmentKey: tailLine.currentTailFragmentKey ?? tailLine.id,
	};
};

const reduceSubtitleMessageAppend = (
	lines: SubtitleLine[],
	message: DecodedSttTextMessage,
	now: number,
): SubtitleLine[] => {
	if (isMixedTranscribeMessage(message)) {
		const stableWord = message.words[0];
		const tailWord = message.words[1];
		if (!stableWord || !tailWord) {
			return applySingleMessageFallback(lines, message, now);
		}
		const stableLine = toSourceFragment(message, stableWord, now);
		const tailLine = toSourceFragment(message, tailWord, now);
		if (!stableLine || !tailLine) {
			return applySingleMessageFallback(lines, message, now);
		}

		let next = upsertLineById(lines, stableLine);
		next = upsertLineById(next, tailLine);
		next = next.filter(
			(line) => line.id !== tailLine.id || line.sourceFragments?.length !== 2,
		);

		return [
			...next.filter((line) => line.id !== tailLine.id),
			createMixedCurrentLine({
				message,
				stableLine,
				tailLine,
				now,
			}),
		].slice(-200);
	}

	if (isSingleFinalFragmentMessage(message)) {
		const word = message.words[0];
		if (!word) {
			return applySingleMessageFallback(lines, message, now);
		}
		const rawNextLine = toSourceFragment(message, word, now);
		if (!rawNextLine) {
			return applySingleMessageFallback(lines, message, now);
		}
		const fragmentKey = rawNextLine.id;
		const existingLine = lines.find(
			(line) =>
				line.id === fragmentKey || line.currentTailFragmentKey === fragmentKey,
		);
		const nextLine = mergeSourceUpdateIntoExistingLine({
			existingLine,
			nextLine: rawNextLine,
			fragmentKey,
		});
		const next = lines.filter(
			(line) =>
				line.currentTailFragmentKey !== fragmentKey && line.id !== fragmentKey,
		);

		return [...next, nextLine].slice(-200);
	}

	if (isSingleTailContinuationMessage(message)) {
		const word = message.words[0];
		if (!word) {
			return applySingleMessageFallback(lines, message, now);
		}
		const fragmentKey = getFragmentKey(message.uid, word.startMs);
		const rawNextLine = toSourceFragment(message, word, now);
		if (!fragmentKey || !rawNextLine) {
			return applySingleMessageFallback(lines, message, now);
		}
		const existingLine = lines.find(
			(line) =>
				line.id === fragmentKey || line.currentTailFragmentKey === fragmentKey,
		);
		const nextLine = mergeSourceUpdateIntoExistingLine({
			existingLine,
			nextLine: rawNextLine,
			fragmentKey,
		});

		const next = lines.filter((line) => {
			if (line.id === fragmentKey) {
				return false;
			}
			if (line.currentTailFragmentKey === fragmentKey) {
				return false;
			}
			return true;
		});

		return [...next, nextLine].slice(-200);
	}

	if (isMixedTranslateMessage(message)) {
		const originalWords = message.originalTranscript?.words ?? [];
		const [stableWord, tailWord] = originalWords;
		const stableFragmentKey = getFragmentKey(message.uid, stableWord?.startMs);
		const tailFragmentKey = getFragmentKey(message.uid, tailWord?.startMs);
		if (!stableFragmentKey || !tailFragmentKey) {
			return applySingleMessageFallback(lines, message, now);
		}

		const stableLine = lines.find((line) => line.id === stableFragmentKey);
		const tailLine = lines.find((line) => line.id === tailFragmentKey);
		if (!stableLine || !tailLine) {
			return lines;
		}

		const stableTranslation = message.trans[0];
		const tailTranslation = message.trans[1];
		const updatedStableLine = { ...stableLine };
		const updatedTailLine = { ...tailLine };

		if (stableTranslation?.lang) {
			const text = stableTranslation.texts.join("");
			if (text) {
				updatedStableLine.targetTexts = {
					...updatedStableLine.targetTexts,
					[stableTranslation.lang]: text,
				};
				updatedStableLine.targetTextFragments = {
					...(updatedStableLine.targetTextFragments ?? {}),
					[stableTranslation.lang]: [
						{
							fragmentKey: stableFragmentKey,
							text,
							isFinal: stableTranslation.isFinal,
						},
					],
				};
				updatedStableLine.targetVersionTextTs = {
					...(updatedStableLine.targetVersionTextTs ?? {}),
					[stableTranslation.lang]:
						message.textTs ??
						updatedStableLine.targetVersionTextTs?.[stableTranslation.lang],
				};
			}
		}

		const combinedTargetTexts: Record<string, string> = {};
		const combinedTargetFragments: Record<
			string,
			SubtitleLineTranslationFragment[]
		> = {};
		for (const translation of [stableTranslation, tailTranslation]) {
			if (!translation?.lang) {
				continue;
			}
			const text = translation.texts.join("");
			if (!text) {
				continue;
			}
			const fragmentKey =
				translation === stableTranslation ? stableFragmentKey : tailFragmentKey;
			combinedTargetFragments[translation.lang] = mergeTextFragments(
				combinedTargetFragments[translation.lang],
				{
					fragmentKey,
					text,
					isFinal: translation.isFinal,
				},
			);
			combinedTargetTexts[translation.lang] =
				(combinedTargetTexts[translation.lang] ?? "") + text;
		}

		updatedTailLine.targetTexts = combinedTargetTexts;
		updatedTailLine.targetTextFragments = combinedTargetFragments;
		updatedTailLine.targetVersionTextTs = Object.fromEntries(
			Object.keys(combinedTargetTexts).map((language) => [
				language,
				message.textTs ?? updatedTailLine.targetVersionTextTs?.[language],
			]),
		);
		updatedTailLine.updatedAt = now;

		return lines.map((line) => {
			if (line.id === stableFragmentKey) {
				return updatedStableLine;
			}
			if (line.id === tailFragmentKey) {
				return updatedTailLine;
			}
			return line;
		});
	}

	if (isSingleTranslateFragmentMessage(message)) {
		const word = message.originalTranscript?.words[0];
		if (!word) {
			return applySingleMessageFallback(lines, message, now);
		}
		const fragmentKey = getFragmentKey(message.uid, word.startMs);
		const translation = message.trans[0];
		if (!fragmentKey || !translation?.lang) {
			return applySingleMessageFallback(lines, message, now);
		}

		const existingLine = lines.find((line) => line.id === fragmentKey);
		const baseLine =
			existingLine ??
			toSourceFragment(
				{
					...message,
					culture: message.originalTranscript?.culture ?? message.culture,
					words: [word],
				},
				word,
				now,
			);
		if (!baseLine) {
			return lines;
		}

		const text = translation.texts.join("");
		const nextTargetFragments = { ...(baseLine.targetTextFragments ?? {}) };
		if (text) {
			nextTargetFragments[translation.lang] = [
				{
					fragmentKey,
					text,
					isFinal: translation.isFinal,
				},
			];
		}

		const nextLine: SubtitleLine = {
			...baseLine,
			sentenceId: message.sentenceId ?? baseLine.sentenceId,
			targetTexts: text
				? { ...baseLine.targetTexts, [translation.lang]: text }
				: baseLine.targetTexts,
			targetVersionTextTs: text
				? {
						...(baseLine.targetVersionTextTs ?? {}),
						[translation.lang]:
							message.textTs ??
							baseLine.targetVersionTextTs?.[translation.lang],
					}
				: baseLine.targetVersionTextTs,
			targetTextFragments: nextTargetFragments,
			isFinal: baseLine.isFinal || translation.isFinal,
			currentTailFragmentKey:
				baseLine.isFinal || translation.isFinal
					? undefined
					: baseLine.currentTailFragmentKey,
			updatedAt: now,
		};

		if (!existingLine) {
			return [...lines, nextLine].slice(-200);
		}

		return lines.map((line) => (line.id === fragmentKey ? nextLine : line));
	}

	return applySingleMessageFallback(lines, message, now);
};

const reduceSubtitleMessageAligned = (
	lines: SubtitleLine[],
	message: DecodedSttTextMessage,
	now: number,
): SubtitleLine[] => {
	if (message.dataType !== "translate") {
		return lines;
	}

	const usesJsonAlignedArrays = message.payloadFormat === "json";
	const alignedOriginalTranscript = usesJsonAlignedArrays
		? message.alignedOriginalTranscript
		: undefined;
	if (usesJsonAlignedArrays && !alignedOriginalTranscript) {
		return lines;
	}

	const id = getAlignedLineId(message);
	const sourceWords = usesJsonAlignedArrays
		? alignedOriginalTranscript.words
		: (message.originalTranscript?.words ?? []);
	const sourceFragments = sourceWords
		.map((word, index) => {
			const text = word.text ?? "";
			if (!text) {
				return null;
			}

			return {
				fragmentKey:
					getFragmentKey(message.uid, word.startMs) ?? `${id}:source:${index}`,
				text,
				isFinal: Boolean(word.isFinal),
			};
		})
		.filter(
			(fragment): fragment is NonNullable<typeof fragment> => fragment !== null,
		);
	const sourceText = sourceFragments.map((fragment) => fragment.text).join("");

	if (!sourceText) {
		return lines;
	}

	const existingLine = lines.find((line) => line.id === id);
	const existingTargetTextFragments = existingLine?.targetTextFragments ?? {};
	const translationOrdinalByLanguage = new Map<string, number>();
	const nextTargetTextFragments: Record<
		string,
		SubtitleLineTranslationFragment[]
	> = {
		...existingTargetTextFragments,
	};

	for (const translation of message.trans) {
		const text = translation.texts.join("");
		if (!translation.lang || !text) {
			continue;
		}

		const ordinal = translationOrdinalByLanguage.get(translation.lang) ?? 0;
		translationOrdinalByLanguage.set(translation.lang, ordinal + 1);
		const pairedSourceFragment =
			sourceFragments[ordinal] ?? sourceFragments.at(-1);
		const fragmentKey =
			pairedSourceFragment?.fragmentKey ??
			`${id}:target:${translation.lang}:${ordinal}`;
		const existingFragmentsForLanguage =
			nextTargetTextFragments[translation.lang] ?? [];
		nextTargetTextFragments[translation.lang] = mergeTextFragments(
			existingFragmentsForLanguage,
			{
				fragmentKey,
				text,
				isFinal: translation.isFinal,
			},
		);
	}

	const targetTexts = Object.fromEntries(
		Object.entries(nextTargetTextFragments)
			.map(([language, fragments]) => [language, joinTextFragments(fragments)])
			.filter(([, text]) => text.length > 0),
	);

	if (Object.keys(targetTexts).length === 0) {
		return lines;
	}

	const isFinal =
		sourceFragments.length > 0 &&
		sourceFragments.every((fragment) => fragment.isFinal) &&
		Object.values(nextTargetTextFragments).every((fragments) =>
			fragments.every((fragment) => fragment.isFinal),
		);
	const targetVersionTextTs = {
		...(existingLine?.targetVersionTextTs ?? {}),
	};
	for (const language of Object.keys(targetTexts)) {
		targetVersionTextTs[language] =
			message.textTs ?? targetVersionTextTs[language];
	}
	const nextLine: SubtitleLine = {
		id,
		speakerUid: message.uid,
		sentenceId: message.sentenceId ?? existingLine?.sentenceId,
		sourceLanguage:
			(usesJsonAlignedArrays
				? alignedOriginalTranscript.culture
				: message.originalTranscript?.culture) ?? message.culture,
		sourceText,
		targetTexts,
		isFinal,
		startedAt: message.time ?? existingLine?.startedAt,
		updatedAt: now,
		sourceVersionTextTs: message.textTs,
		targetVersionTextTs,
		sourceFragments,
		targetTextFragments: nextTargetTextFragments,
		currentTailFragmentKey: sourceFragments.findLast(
			(fragment) => !fragment.isFinal,
		)?.fragmentKey,
	};

	return upsertLineById(lines, nextLine).slice(-200);
};

export const reduceSubtitleMessage = (
	lines: SubtitleLine[],
	message: DecodedSttTextMessage,
	now = Date.now(),
	subtitleRenderMode: SubtitleRenderMode = "append",
): SubtitleLine[] =>
	subtitleRenderMode === "aligned"
		? reduceSubtitleMessageAligned(lines, message, now)
		: reduceSubtitleMessageAppend(lines, message, now);

export const reduceSubtitleMessages = (
	lines: SubtitleLine[],
	messages: DecodedSttTextMessage[],
	subtitleRenderMode: SubtitleRenderMode = "append",
) =>
	messages.reduce(
		(currentLines, message) =>
			reduceSubtitleMessage(
				currentLines,
				message,
				Date.now(),
				subtitleRenderMode,
			),
		lines,
	);

const getResolvedSentenceId = (line: SubtitleLine) =>
	line.sentenceId ?? line.id;

const hasLaterSentenceForSameSpeaker = (
	lines: SubtitleLine[],
	line: SubtitleLine,
) => {
	const sentenceId = getResolvedSentenceId(line);
	const lineIndex = lines.findIndex((item) => item.id === line.id);
	if (lineIndex === -1) {
		return false;
	}

	return lines
		.slice(lineIndex + 1)
		.some(
			(nextLine) =>
				nextLine.speakerUid === line.speakerUid &&
				getResolvedSentenceId(nextLine) !== sentenceId,
		);
};

const getLastFinalSourceFragmentIndex = (line: SubtitleLine) => {
	const fragments = line.sourceFragments ?? [];
	let lastFinalIndex = -1;
	for (let index = 0; index < fragments.length; index += 1) {
		const fragment = fragments[index];
		if (!fragment?.isFinal) {
			break;
		}
		lastFinalIndex = index;
	}
	return lastFinalIndex;
};

const getFinalSourceText = (line: SubtitleLine) => {
	if (!line.sourceFragments?.length) {
		return line.isFinal ? line.sourceText : undefined;
	}

	const finalFragments = line.sourceFragments.filter(
		(fragment) => fragment.isFinal,
	);
	return finalFragments.length > 0
		? finalFragments.map((fragment) => fragment.text).join("")
		: undefined;
};

const getFinalTargetText = (line: SubtitleLine, language: string) => {
	const fragments = line.targetTextFragments?.[language] ?? [];
	if (fragments.length > 0) {
		const finalFragments = fragments.filter((fragment) => fragment.isFinal);
		if (finalFragments.length === 0) {
			return undefined;
		}
		return finalFragments.map((fragment) => fragment.text).join("");
	}

	const lineLevelText = line.targetTexts[language];
	return line.isFinal && lineLevelText ? lineLevelText : undefined;
};

const getProjectedSourceFragments = (
	line: SubtitleLine,
	includeNonFinal: boolean,
) => {
	const fragments = line.sourceFragments ?? [];
	if (fragments.length === 0) {
		return line.sourceText && (includeNonFinal || line.isFinal)
			? [
					{
						fragmentKey: line.id,
						text: line.sourceText,
						isFinal: line.isFinal,
					},
				]
			: [];
	}

	return includeNonFinal
		? fragments
		: fragments.filter((fragment) => fragment.isFinal);
};

const hasFinalSourceFragment = (line: SubtitleLine) => {
	const fragments = line.sourceFragments ?? [];
	if (fragments.length === 0) {
		return line.isFinal && Boolean(line.sourceText);
	}

	return fragments.some((fragment) => fragment.isFinal);
};

const getProjectedTargetFragments = (
	line: SubtitleLine,
	language: string,
	includeNonFinal: boolean,
) => {
	const fragments = line.targetTextFragments?.[language] ?? [];
	if (fragments.length === 0) {
		const text = line.targetTexts[language];
		return text && (includeNonFinal || line.isFinal)
			? [
					{
						fragmentKey: line.id,
						text,
						isFinal: line.isFinal,
					},
				]
			: [];
	}

	return includeNonFinal
		? fragments
		: fragments.filter((fragment) => fragment.isFinal);
};

const getAlignedStableHistoryLine = (line: SubtitleLine) => {
	if (!line.sourceFragments?.length) {
		if (!line.isFinal) {
			return null;
		}
		return {
			...line,
			isFinal: true,
			currentTailFragmentKey: undefined,
		};
	}

	const finalPrefixIndex = getLastFinalSourceFragmentIndex(line);
	if (finalPrefixIndex < 0) {
		return null;
	}

	const sourceFragments = line.sourceFragments.slice(0, finalPrefixIndex + 1);
	const stableFragmentKeys = new Set(
		sourceFragments.map((fragment) => fragment.fragmentKey),
	);
	const targetTextFragments = Object.fromEntries(
		Object.entries(line.targetTextFragments ?? {})
			.map(([language, fragments]) => [
				language,
				fragments.filter(
					(fragment) =>
						fragment.isFinal && stableFragmentKeys.has(fragment.fragmentKey),
				),
			])
			.filter(([, fragments]) => fragments.length > 0),
	);
	const targetTexts = Object.fromEntries(
		Object.entries(targetTextFragments).map(([language, fragments]) => [
			language,
			joinTextFragments(fragments),
		]),
	);

	return {
		...line,
		sourceText: sourceFragments.map((fragment) => fragment.text).join(""),
		targetTexts,
		isFinal: true,
		sourceFragments,
		targetTextFragments,
		currentTailFragmentKey: undefined,
	};
};

const getAlignedHistoryLine = (lines: SubtitleLine[], line: SubtitleLine) => {
	const stableLine = getAlignedStableHistoryLine(line);
	if (stableLine) {
		return stableLine;
	}

	if (!hasLaterSentenceForSameSpeaker(lines, line)) {
		return null;
	}

	return {
		...line,
		currentTailFragmentKey: undefined,
	};
};

const isLineFullyStable = (line: SubtitleLine) => {
	if (!line.isFinal) {
		return false;
	}
	const sourceFragments = line.sourceFragments ?? [];
	const targetFragments = Object.values(line.targetTextFragments ?? {}).flat();
	return (
		sourceFragments.every((fragment) => fragment.isFinal) &&
		targetFragments.every((fragment) => fragment.isFinal)
	);
};

const projectAlignedCurrentLine = (lines: SubtitleLine[]) => {
	for (let index = lines.length - 1; index >= 0; index -= 1) {
		const line = lines[index];
		if (!line) {
			continue;
		}
		if (!isLineFullyStable(line)) {
			return line;
		}
	}
	return lines.at(-1);
};

const projectAlignedHistoryLines = (lines: SubtitleLine[]) => {
	const currentLine = projectAlignedCurrentLine(lines);
	return lines
		.filter((line) => line.id !== currentLine?.id)
		.map((line) => getAlignedHistoryLine(lines, line))
		.filter((line): line is SubtitleLine => line !== null)
		.sort((left, right) => left.updatedAt - right.updatedAt)
		.slice(-8);
};

export const projectAppendHistoryEntries = (
	lines: SubtitleLine[],
	displayMode: "both" | "source" | "target",
	activeTargetLanguage: string,
) => {
	const currentLine = lines.at(-1);
	const currentSentenceId = currentLine
		? getResolvedSentenceId(currentLine)
		: undefined;
	const historyBySentenceId = new Map<string, SubtitleHistoryEntry>();

	for (const line of lines) {
		const sentenceId = getResolvedSentenceId(line);
		if (sentenceId === currentSentenceId) {
			continue;
		}

		const includeNonFinal =
			hasLaterSentenceForSameSpeaker(lines, line) &&
			!hasFinalSourceFragment(line);
		const sourceFragments = getProjectedSourceFragments(line, includeNonFinal);
		const finalSourceText = sourceFragments.length
			? sourceFragments.map((fragment) => fragment.text).join("")
			: getFinalSourceText(line);
		const targetFragments =
			activeTargetLanguage.length > 0
				? getProjectedTargetFragments(
						line,
						activeTargetLanguage,
						includeNonFinal,
					)
				: [];
		const finalTargetText =
			targetFragments.length > 0
				? targetFragments.map((fragment) => fragment.text).join("")
				: activeTargetLanguage.length > 0
					? getFinalTargetText(line, activeTargetLanguage)
					: undefined;
		const shouldInclude =
			displayMode === "both"
				? Boolean(finalSourceText)
				: displayMode === "source"
					? Boolean(finalSourceText)
					: Boolean(finalTargetText);
		if (!shouldInclude) {
			continue;
		}

		historyBySentenceId.set(sentenceId, {
			id: line.id,
			speakerUid: line.speakerUid,
			sentenceId: line.sentenceId,
			updatedAt: line.updatedAt,
			sourceText: displayMode === "target" ? undefined : finalSourceText,
			targetTexts:
				finalTargetText === undefined || activeTargetLanguage.length === 0
					? {}
					: { [activeTargetLanguage]: finalTargetText },
			sourceFragments: displayMode === "target" ? undefined : sourceFragments,
			targetTextFragments:
				targetFragments.length === 0 || activeTargetLanguage.length === 0
					? undefined
					: { [activeTargetLanguage]: targetFragments },
		});
	}

	return [...historyBySentenceId.values()]
		.sort((left, right) => left.updatedAt - right.updatedAt)
		.slice(-8);
};

export const projectSubtitleHistoryLines = (
	lines: SubtitleLine[],
	subtitleRenderMode: SubtitleRenderMode = "append",
) => {
	if (subtitleRenderMode === "aligned") {
		return projectAlignedHistoryLines(lines);
	}

	return projectAppendHistoryEntries(lines, "both", "en-US").map((entry) => ({
		id: entry.id,
		speakerUid: entry.speakerUid,
		sentenceId: entry.sentenceId,
		sourceText: entry.sourceText ?? "",
		targetTexts: entry.targetTexts,
		isFinal:
			(entry.sourceFragments ?? []).every((fragment) => fragment.isFinal) &&
			Object.values(entry.targetTextFragments ?? {}).every((fragments) =>
				fragments.every((fragment) => fragment.isFinal),
			),
		updatedAt: entry.updatedAt,
		sourceFragments: entry.sourceFragments,
		targetTextFragments: entry.targetTextFragments,
	}));
};

export const projectSubtitleCurrentLine = (
	lines: SubtitleLine[],
	subtitleRenderMode: SubtitleRenderMode = "append",
) => {
	if (lines.length === 0) {
		return undefined;
	}

	if (subtitleRenderMode === "aligned") {
		return projectAlignedCurrentLine(lines);
	}

	const historySentenceIds = new Set(
		projectSubtitleHistoryLines(lines, subtitleRenderMode).map((line) =>
			getResolvedSentenceId(line),
		),
	);
	for (let index = lines.length - 1; index >= 0; index -= 1) {
		const line = lines[index];
		if (!line) {
			continue;
		}
		if (!historySentenceIds.has(getResolvedSentenceId(line))) {
			return line;
		}
	}
	return lines.at(-1);
};
