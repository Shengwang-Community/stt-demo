import { enUSMessages } from "./messages/en-US";
import { zhCNMessages } from "./messages/zh-CN";
import type { MessageTree, ProductLocale } from "./types";

export const MESSAGE_CATALOGS = {
	"en-US": enUSMessages,
	"zh-CN": zhCNMessages,
} satisfies Record<ProductLocale, MessageTree>;

export const getMessages = (locale: ProductLocale) => MESSAGE_CATALOGS[locale];

const collectMessageKeys = (
	tree: MessageTree,
	prefix = "",
	keys: string[] = [],
): string[] => {
	for (const [key, value] of Object.entries(tree)) {
		const nextKey = prefix ? `${prefix}.${key}` : key;
		if (typeof value === "string" || typeof value === "function") {
			keys.push(nextKey);
			continue;
		}
		collectMessageKeys(value, nextKey, keys);
	}

	return keys.sort();
};

export const getMessageKeys = (locale: ProductLocale) =>
	collectMessageKeys(MESSAGE_CATALOGS[locale]);

