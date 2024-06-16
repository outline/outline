export const IconCategory = {
  All: "All",
  Frequent: "Frequently Used",
  Search: "Search Results",
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
