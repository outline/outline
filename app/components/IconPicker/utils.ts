import i18next from "i18next";

export enum DisplayCategory {
  All = "All",
  Frequent = "Frequent",
  Search = "Search",
}

export const TRANSLATED_CATEGORIES = {
  All: i18next.t("All"),
  Frequent: i18next.t("Frequently Used"),
  Search: i18next.t("Search Results"),
  People: i18next.t("Smileys & People"),
  Nature: i18next.t("Animals & Nature"),
  Foods: i18next.t("Food & Drink"),
  Activity: i18next.t("Activity"),
  Places: i18next.t("Travel & Places"),
  Objects: i18next.t("Objects"),
  Symbols: i18next.t("Symbols"),
  Flags: i18next.t("Flags"),
};

export const FREQUENTLY_USED_COUNT = {
  Get: 24,
  Track: 30,
};

const STORAGE_KEYS = {
  Base: "icon-state",
  EmojiSkinTone: "emoji-skintone",
  IconsFrequency: "icons-freq",
  EmojisFrequency: "emojis-freq",
  LastIcon: "last-icon",
  LastEmoji: "last-emoji",
};

const getStorageKey = (key: string) => `${STORAGE_KEYS.Base}.${key}`;

export const emojiSkinToneKey = getStorageKey(STORAGE_KEYS.EmojiSkinTone);

export const iconsFreqKey = getStorageKey(STORAGE_KEYS.IconsFrequency);

export const emojisFreqKey = getStorageKey(STORAGE_KEYS.EmojisFrequency);

export const lastIconKey = getStorageKey(STORAGE_KEYS.LastIcon);

export const lastEmojiKey = getStorageKey(STORAGE_KEYS.LastEmoji);

export const sortFrequencies = (freqs: [string, number][]) =>
  freqs.sort((a, b) => (a[1] >= b[1] ? -1 : 1));
