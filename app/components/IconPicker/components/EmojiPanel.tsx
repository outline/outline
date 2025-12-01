import concat from "lodash/concat";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { EmojiCategory, EmojiSkinTone, IconType } from "@shared/types";
import { getEmojis, getEmojisWithCategory, search } from "@shared/utils/emoji";
import Flex from "~/components/Flex";
import { DisplayCategory } from "../utils";
import GridTemplate, { DataNode } from "./GridTemplate";
import SkinTonePicker from "./SkinTonePicker";
import { StyledInputSearch, UserInputContainer } from "./Components";
import { useIconState } from "../useIconState";
import useStores from "~/hooks/useStores";

const GRID_HEIGHT = 410;

type Props = {
  panelWidth: number;
  query: string;
  panelActive: boolean;
  height?: number;
  onEmojiChange: (emoji: string) => void;
  onQueryChange: (query: string) => void;
};

const EmojiPanel = ({
  panelWidth,
  query,
  panelActive,
  onEmojiChange,
  onQueryChange,
  height = GRID_HEIGHT,
}: Props) => {
  const { t } = useTranslation();
  const { emojis } = useStores();

  const searchRef = React.useRef<HTMLInputElement | null>(null);
  const scrollableRef = React.useRef<HTMLDivElement | null>(null);

  const {
    emojiSkinTone: skinTone,
    setEmojiSkinTone,
    incrementIconCount,
    getFrequentIcons,
  } = useIconState(IconType.Emoji);

  const freqEmojis = React.useMemo(
    () => getFrequentIcons(),
    [getFrequentIcons]
  );

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
      incrementIconCount(id);
    },
    [onEmojiChange, incrementIconCount]
  );

  const isSearch = query !== "";
  const templateData: DataNode[] = isSearch
    ? getSearchResults({
        query,
        skinTone,
        customEmojis: emojis.orderedData,
      })
    : getAllEmojis({
        skinTone,
        freqEmojis,
      });

  React.useLayoutEffect(() => {
    if (!panelActive) {
      return;
    }
    scrollableRef.current?.scroll({ top: 0 });
    requestAnimationFrame(() => searchRef.current?.focus());
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
        height={height - 48}
        data={templateData}
        onIconSelect={handleEmojiSelection}
      />
    </Flex>
  );
};

const getSearchResults = ({
  query,
  skinTone,
  customEmojis = [],
}: {
  query: string;
  skinTone: EmojiSkinTone;
  customEmojis?: Array<{ id: string; name: string; url: string }>;
}): DataNode[] => {
  const emojis = search({ query, skinTone, customEmojis });
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

  const getFrequentIcons = (): DataNode => {
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
    getFrequentIcons(),
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

export default EmojiPanel;
