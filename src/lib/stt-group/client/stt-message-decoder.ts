import protobuf from "protobufjs";
import type { DecodedSttTextMessage } from "../domain";
import { logSubtitleDebug } from "./subtitle-debug";

const sttMessageProto = `
syntax = "proto3";
package Agora.SpeechToText;

message Text {
  reserved 1 to 3, 5, 7 to 9, 11, 17;
  int64 uid = 4;
  int64 time = 6;
  repeated Word words = 10;
  int32 duration_ms = 12;
  string data_type = 13;
  repeated Translation trans = 14;
  string culture = 15;
  int64 text_ts = 16;
  OriginalTranscript original_transcript = 18;
  int64 sentence_id = 19;
}

message Word {
  string text = 1;
  int32 start_ms = 2;
  int32 duration_ms = 3;
  bool is_final = 4;
  double confidence = 5;
}

message Translation {
  bool is_final = 1;
  string lang = 2;
  repeated string texts = 3;
}

message OriginalTranscript {
  string culture = 1;
  repeated Word words = 2;
}
`;

const root = protobuf.parse(sttMessageProto).root;
const TextMessage = root.lookupType("Agora.SpeechToText.Text");

type RawWord = {
	text?: string;
	startMs?: number;
	start_ms?: number;
	durationMs?: number;
	duration_ms?: number;
	isFinal?: boolean;
	is_final?: boolean;
};

type RawTranslation = {
	lang?: string;
	texts?: string[];
	isFinal?: boolean;
	is_final?: boolean;
};

type RawTextMessage = {
	uid?: string | number;
	time?: string | number;
	words?: RawWord[];
	durationMs?: number;
	duration_ms?: number;
	dataType?: string;
	data_type?: string;
	trans?: RawTranslation[];
	culture?: string;
	textTs?: string | number;
	text_ts?: string | number;
	sentenceId?: string | number;
	sentence_id?: string | number;
	originalTranscript?: {
		culture?: string;
		words?: RawWord[];
	};
	original_transcript?: {
		culture?: string;
		words?: RawWord[];
	};
};

const toOptionalNumber = (value: unknown) => {
	if (value === undefined || value === null || value === "") {
		return undefined;
	}
	const numberValue = Number(value);
	return Number.isFinite(numberValue) ? numberValue : undefined;
};

const toOptionalString = (value: unknown) => {
	if (value === undefined || value === null || value === "") {
		return undefined;
	}
	return String(value);
};

const normalizeWords = (words: RawWord[] | undefined) =>
	(words ?? []).map((word) => ({
		text: word.text ?? "",
		startMs: toOptionalNumber(word.startMs ?? word.start_ms),
		durationMs: toOptionalNumber(word.durationMs ?? word.duration_ms),
		isFinal: Boolean(word.isFinal ?? word.is_final),
	}));

export const decodeSttTextMessage = (
	stream: Uint8Array,
): DecodedSttTextMessage => {
	const decoded = TextMessage.decode(stream);
	const object = TextMessage.toObject(decoded, {
		longs: String,
		defaults: false,
		arrays: true,
	}) as RawTextMessage;
	const dataType = object.dataType ?? object.data_type ?? "unknown";
	logSubtitleDebug(`decoded pb payload ${dataType}`, object);
	const originalTranscript =
		object.originalTranscript ?? object.original_transcript;

	return {
		uid: String(object.uid ?? ""),
		time: toOptionalNumber(object.time),
		durationMs: object.durationMs ?? object.duration_ms,
		dataType: object.dataType ?? object.data_type,
		culture: object.culture,
		textTs: toOptionalNumber(object.textTs ?? object.text_ts),
		sentenceId: toOptionalString(object.sentenceId ?? object.sentence_id),
		words: normalizeWords(object.words),
		trans: (object.trans ?? []).map((translation) => ({
			lang: translation.lang ?? "",
			texts: translation.texts ?? [],
			isFinal: Boolean(translation.isFinal ?? translation.is_final),
		})),
		originalTranscript: originalTranscript
			? {
					culture: originalTranscript.culture,
					words: normalizeWords(originalTranscript.words),
				}
			: undefined,
		payloadFormat: "pb",
	};
};
