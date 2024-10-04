import concat from "lodash/concat";
import React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { EmojiCategory, EmojiSkinTone, IconType } from "@shared/types";
import { getEmojis, getEmojisWithCategory, search } from "@shared/utils/emoji";
import Flex from "~/components/Flex";
import InputSearch from "~/components/InputSearch";
import usePersistedState from "~/hooks/usePersistedState";
import {
  FREQUENTLY_USED_COUNT,
  DisplayCategory,
  emojiSkinToneKey,
  emojisFreqKey,
  lastEmojiKey,
  sortFrequencies,
} from "../utils";
import GridTemplate, { DataNode } from "./GridTemplate";
import SkinTonePicker from "./SkinTonePicker";

/**
 * This is needed as a constant for react-window.
 * Calculated from the heights of TabPanel and InputSearch.
 */
const GRID_HEIGHT = 362;

const useEmojiState = () => {
  const [emojiSkinTone, setEmojiSkinTone] = usePersistedState<EmojiSkinTone>(
    emojiSkinToneKey,
    EmojiSkinTone.Default
  );
  const [emojisFreq, setEmojisFreq] = usePersistedState<Record<string, number>>(
    emojisFreqKey,
    {}
  );
  const [lastEmoji, setLastEmoji] = usePersistedState<string | undefined>(
    lastEmojiKey,
    undefined
  );

  const incrementEmojiCount = React.useCallback(
    (emoji: string) => {
      emojisFreq[emoji] = (emojisFreq[emoji] ?? 0) + 1;
      setEmojisFreq({ ...emojisFreq });
      setLastEmoji(emoji);
    },
    [emojisFreq, setEmojisFreq, setLastEmoji]
  );

  const getFreqEmojis = React.useCallback(() => {
    const freqs = Object.entries(emojisFreq);

    if (freqs.length > FREQUENTLY_USED_COUNT.Track) {
      sortFrequencies(freqs).splice(FREQUENTLY_USED_COUNT.Track);
      setEmojisFreq(Object.fromEntries(freqs));
    }

    const emojis = sortFrequencies(freqs)
      .slice(0, FREQUENTLY_USED_COUNT.Get)
      .map(([emoji, _]) => emoji);

    const isLastPresent = emojis.includes(lastEmoji ?? "");
    if (lastEmoji && !isLastPresent) {
      emojis.pop();
      emojis.push(lastEmoji);
    }

    return emojis;
  }, [emojisFreq, setEmojisFreq, lastEmoji]);

  return {
    emojiSkinTone,
    setEmojiSkinTone,
    incrementEmojiCount,
    getFreqEmojis,
  };
};

type Props = {
  panelWidth: number;
  query: string;
  panelActive: boolean;
  onEmojiChange: (emoji: string) => void;
  onQueryChange: (query: string) => void;
};

const EmojiPanel = ({
  panelWidth,
  query,
  panelActive,
  onEmojiChange,
  onQueryChange,
}: Props) => {
  const { t } = useTranslation();

  const searchRef = React.useRef<HTMLInputElement | null>(null);
  const scrollableRef = React.useRef<HTMLDivElement | null>(null);

  const {
    emojiSkinTone: skinTone,
    setEmojiSkinTone,
    incrementEmojiCount,
    getFreqEmojis,
  } = useEmojiState();

  const freqEmojis = React.useMemo(() => getFreqEmojis(), [getFreqEmojis]);

  const handleFilter = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onQueryChange(event.target.value);
    },
    [onQueryChange]
  );

  const handleSkinChange = React.useCallback(
    (emojiSkinTone: EmojiSkinTone) => {
      setEmojiSkinTone(emojiSkinTone);
    },
    [setEmojiSkinTone]
  );

  const handleEmojiSelection = React.useCallback(
    ({ id, value }: { id: string; value: string }) => {
      onEmojiChange(value);
      incrementEmojiCount(id);
    },
    [onEmojiChange, incrementEmojiCount]
  );

  const isSearch = query !== "";
  const templateData: DataNode[] = isSearch
    ? getSearchResults({
        query,
        skinTone,
      })
    : getAllEmojis({
        skinTone,
        freqEmojis,
      });

  React.useEffect(() => {
    if (scrollableRef.current) {
      scrollableRef.current.scrollTop = 0;
    }
    searchRef.current?.focus();
  }, [panelActive]);

  return (
    <Flex column>
      <UserInputContainer align="center" gap={12}>
        <StyledInputSearch
          ref={searchRef}
          value={query}
          placeholder={`${t("Search emoji")}…`}
          onChange={handleFilter}
        />
        <SkinTonePicker skinTone={skinTone} onChange={handleSkinChange} />
      </UserInputContainer>
      <GridTemplate
        ref={scrollableRef}
        width={panelWidth}
        height={GRID_HEIGHT}
        data={templateData}
        onIconSelect={handleEmojiSelection}
      />
    </Flex>
  );
};

const getSearchResults = ({
  query,
  skinTone,
}: {
  query: string;
  skinTone: EmojiSkinTone;
}): DataNode[] => {
  const emojis = search({ query, skinTone });
  return [
    {
      category: DisplayCategory.Search,
      icons: emojis.map((emoji) => ({
        type: IconType.Emoji,
        id: emoji.id,
        value: emoji.value,
      })),
    },
  ];
};

const getAllEmojis = ({
  skinTone,
  freqEmojis,
}: {
  skinTone: EmojiSkinTone;
  freqEmojis: string[];
}): DataNode[] => {
  const emojisWithCategory = getEmojisWithCategory({ skinTone });

  const getFrequentEmojis = (): DataNode => {
    const emojis = getEmojis({ ids: freqEmojis, skinTone });
    return {
      category: DisplayCategory.Frequent,
      icons: emojis.map((emoji) => ({
        type: IconType.Emoji,
        id: emoji.id,
        value: emoji.value,
      })),
    };
  };

  const getCategoryData = (emojiCategory: EmojiCategory): DataNode => {
    const emojis = emojisWithCategory[emojiCategory] ?? [];
    return {
      category: emojiCategory,
      icons: emojis.map((emoji) => ({
        type: IconType.Emoji,
        id: emoji.id,
        value: emoji.value,
      })),
    };
  };

  return concat(
    getFrequentEmojis(),
    getCategoryData(EmojiCategory.People),
    getCategoryData(EmojiCategory.Nature),
    getCategoryData(EmojiCategory.Foods),
    getCategoryData(EmojiCategory.Activity),
    getCategoryData(EmojiCategory.Places),
    getCategoryData(EmojiCategory.Objects),
    getCategoryData(EmojiCategory.Symbols),
    getCategoryData(EmojiCategory.Flags)
  );
};

const UserInputContainer = styled(Flex)`
  height: 48px;
  padding: 6px 12px 0px;
`;

const StyledInputSearch = styled(InputSearch)`
  flex-grow: 1;
`;

export default EmojiPanel;
