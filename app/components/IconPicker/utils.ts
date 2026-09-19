import i18next from "i18next";
import { IconType } from "@shared/types";
import { FrequencyTracker } from "@shared/utils/FrequencyTracker";

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
  Custom: i18next.t("Custom"),
};

const STORAGE_KEYS = {
  Base: "icon-state",
  EmojiSkinTone: "emoji-skintone",
  IconsFrequency: "icons-freq",
  EmojisFrequency: "emojis-freq",
  LastIcon: "last-icon",
  LastEmoji: "last-emoji",
  CustomEmojisFrequency: "custom-emojis-freq",
  LastCustomEmoji: "last-custom-emoji",
};

const getStorageKey = (key: string) => `${STORAGE_KEYS.Base}.${key}`;

export const emojiSkinToneKey = getStorageKey(STORAGE_KEYS.EmojiSkinTone);

const createFrequencyTracker = (freqKey: string, lastKey: string) =>
  new FrequencyTracker<string>({
    key: getStorageKey(freqKey),
    recentKey: getStorageKey(lastKey),
    track: 30,
    get: 24,
  });

/** Tracks the icons used most frequently, by type of icon. */
export const iconFrequencies: Record<IconType, FrequencyTracker<string>> = {
  [IconType.SVG]: createFrequencyTracker(
    STORAGE_KEYS.IconsFrequency,
    STORAGE_KEYS.LastIcon
  ),
  [IconType.Emoji]: createFrequencyTracker(
    STORAGE_KEYS.EmojisFrequency,
    STORAGE_KEYS.LastEmoji
  ),
  [IconType.Custom]: createFrequencyTracker(
    STORAGE_KEYS.CustomEmojisFrequency,
    STORAGE_KEYS.LastCustomEmoji
  ),
};
