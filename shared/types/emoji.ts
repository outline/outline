export enum IconType {
  SVG = "svg",
  Emoji = "emoji",
  Custom = "custom",
}

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

export enum EmojiSkinTone {
  Default = "Default",
  Light = "Light",
  MediumLight = "MediumLight",
  Medium = "Medium",
  MediumDark = "MediumDark",
  Dark = "Dark",
}

export type Emoji = {
  id: string;
  name: string;
  value: string;
};

export type EmojiVariants = {
  [EmojiSkinTone.Default]: Emoji;
  [EmojiSkinTone.Light]?: Emoji;
  [EmojiSkinTone.MediumLight]?: Emoji;
  [EmojiSkinTone.Medium]?: Emoji;
  [EmojiSkinTone.MediumDark]?: Emoji;
  [EmojiSkinTone.Dark]?: Emoji;
};

export type ReactionSummary = {
  emoji: string;
  userIds: string[];
};
