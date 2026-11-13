/** The kinds of icon that can be set on a document or collection. */
export enum IconType {
  SVG = "svg",
  Emoji = "emoji",
  Custom = "custom",
}

/** Categories used to group emoji in the picker. */
export enum EmojiCategory {
  People = "People",
  Nature = "Nature",
  Foods = "Foods",
  Activity = "Activity",
  Places = "Places",
  Objects = "Objects",
  Symbols = "Symbols",
  Flags = "Flags",
}

/** Skin tone variants that an emoji can have. */
export enum EmojiSkinTone {
  Default = "Default",
  Light = "Light",
  MediumLight = "MediumLight",
  Medium = "Medium",
  MediumDark = "MediumDark",
  Dark = "Dark",
}

/** A single emoji. */
export type Emoji = {
  id: string;
  name: string;
  value: string;
};

/** The skin tone variants of an emoji, keyed by tone. */
export type EmojiVariants = {
  [EmojiSkinTone.Default]: Emoji;
  [EmojiSkinTone.Light]?: Emoji;
  [EmojiSkinTone.MediumLight]?: Emoji;
  [EmojiSkinTone.Medium]?: Emoji;
  [EmojiSkinTone.MediumDark]?: Emoji;
  [EmojiSkinTone.Dark]?: Emoji;
};

/** A reaction emoji and the users who reacted with it. */
export type ReactionSummary = {
  emoji: string;
  userIds: string[];
};
