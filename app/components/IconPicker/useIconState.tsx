import { emojiSkinToneKey, iconFrequencies } from "./utils";
import useFrequencyTracker from "~/hooks/useFrequencyTracker";
import usePersistedState from "~/hooks/usePersistedState";
import { EmojiSkinTone, IconType } from "@shared/types";

const skinToneKeys = {
  [IconType.Custom]: "",
  [IconType.Emoji]: emojiSkinToneKey,
  [IconType.SVG]: "",
};

export const useIconState = (type: IconType) => {
  const [emojiSkinTone, setEmojiSkinTone] = usePersistedState<EmojiSkinTone>(
    skinToneKeys[type],
    EmojiSkinTone.Default
  );

  const { frequent: frequentIcons, track: incrementIconCount } =
    useFrequencyTracker(iconFrequencies[type]);

  return {
    emojiSkinTone,
    setEmojiSkinTone,
    incrementIconCount,
    frequentIcons,
  };
};
