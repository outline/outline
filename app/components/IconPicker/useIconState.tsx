import {
  customEmojisFreqKey,
  emojisFreqKey,
  emojiSkinToneKey,
  FREQUENTLY_USED_COUNT,
  iconsFreqKey,
  lastCustomEmojiKey,
  lastEmojiKey,
  lastIconKey,
  sortFrequencies,
} from "./utils";
import usePersistedState from "~/hooks/usePersistedState";
import { EmojiSkinTone, IconType } from "@shared/types";
import React from "react";

const lastIconKeys = {
  [IconType.Custom]: lastCustomEmojiKey,
  [IconType.Emoji]: lastEmojiKey,
  [IconType.SVG]: lastIconKey,
};

const freqIconKeys = {
  [IconType.Custom]: customEmojisFreqKey,
  [IconType.Emoji]: emojisFreqKey,
  [IconType.SVG]: iconsFreqKey,
};

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

  const [iconFreq, setIconFreq] = usePersistedState<Record<string, number>>(
    freqIconKeys[type],
    {}
  );

  const [lastIcon, setLastIcon] = usePersistedState<string | undefined>(
    lastIconKeys[type],
    undefined
  );

  const incrementIconCount = React.useCallback(
    (emoji: string) => {
      iconFreq[emoji] = (iconFreq[emoji] ?? 0) + 1;
      setIconFreq({ ...iconFreq });
      setLastIcon(emoji);
    },
    [iconFreq, setIconFreq, setLastIcon]
  );

  const getFrequentIcons = React.useCallback((): string[] => {
    const freqs = Object.entries(iconFreq);

    if (freqs.length > FREQUENTLY_USED_COUNT.Track) {
      const trimmed = sortFrequencies(freqs).slice(
        0,
        FREQUENTLY_USED_COUNT.Track
      );
      setIconFreq(Object.fromEntries(trimmed));
    }

    const emojis = sortFrequencies(freqs)
      .slice(0, FREQUENTLY_USED_COUNT.Get)
      .map(([emoji, _]) => emoji);

    const isLastPresent = emojis.includes(lastIcon ?? "");
    if (lastIcon && !isLastPresent) {
      emojis.pop();
      emojis.push(lastIcon);
    }

    return emojis;
  }, [iconFreq, lastIcon, setIconFreq]);

  return {
    emojiSkinTone,
    setEmojiSkinTone,
    incrementIconCount,
    getFrequentIcons,
  };
};
