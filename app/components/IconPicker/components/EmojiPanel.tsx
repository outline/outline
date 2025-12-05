import concat from "lodash/concat";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { EmojiCategory, EmojiSkinTone, IconType } from "@shared/types";
import { getEmojis, getEmojisWithCategory, search } from "@shared/utils/emoji";
import Flex from "~/components/Flex";
import { DisplayCategory } from "../utils";
import GridTemplate, { DataNode, EmojiNode } from "./GridTemplate";
import SkinTonePicker from "./SkinTonePicker";
import { StyledInputSearch, UserInputContainer } from "./Components";
import { useIconState } from "../useIconState";
import useStores from "~/hooks/useStores";
import Emoji from "~/models/Emoji";

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

  const {
    incrementIconCount: incrementCustomIconCount,
    getFrequentIcons: getFrequentCustomIcons,
  } = useIconState(IconType.Custom);

  const freqEmojis = React.useMemo(
    () => getFrequentIcons(),
    [getFrequentIcons]
  );

  const [freqCustomEmojis, setFreqCustomEmojis] = React.useState<EmojiNode[]>(
    []
  );
  const [customEmojiData, setCustomEmojiData] = React.useState<EmojiNode[]>([]);

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

      // Determine if this is a custom emoji by checking if it's in the custom emoji data
      const isCustomEmoji =
        customEmojiData.some((emoji) => emoji.id === id) ||
        freqCustomEmojis.some((emoji) => emoji.id === id);

      if (isCustomEmoji) {
        incrementCustomIconCount(id);
      } else {
        incrementIconCount(id);
      }
    },
    [
      onEmojiChange,
      incrementIconCount,
      incrementCustomIconCount,
      customEmojiData,
      freqCustomEmojis,
    ]
  );

  React.useEffect(() => {
    // Load custom emojis
    emojis.fetchAll().then(() => {
      setCustomEmojiData(emojis.orderedData.map(toIcon));
    });

    // Load frequent custom emojis
    getFrequentCustomIcons().forEach((id) => {
      emojis
        .fetch(id)
        .then((emoji) => {
          setFreqCustomEmojis((prev) => {
            if (prev.some((item) => item.id === id)) {
              return prev;
            }
            return [...prev, toIcon(emoji)];
          });
        })
        .catch(() => {
          // ignore
        });
    });
  }, [emojis, getFrequentCustomIcons]);

  const isSearch = query !== "";
  const templateData: DataNode[] = isSearch
    ? getSearchResults({
        query,
        skinTone,
        customEmojis: customEmojiData,
      })
    : getAllEmojis({
        skinTone,
        freqEmojis,
        customEmojis: customEmojiData,
        freqCustomEmojis,
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
  customEmojis,
}: {
  query: string;
  skinTone: EmojiSkinTone;
  customEmojis: EmojiNode[];
}): DataNode[] => {
  const emojis = search({ query, skinTone });

  // Search custom emojis by name
  const matchingCustomEmojis = customEmojis.filter((emoji) =>
    emoji.name?.toLowerCase().includes(query.toLowerCase())
  );

  const allResults = [
    ...emojis.map((emoji) => ({
      type: IconType.Emoji as const,
      id: emoji.id,
      value: emoji.value,
    })),
    ...matchingCustomEmojis,
  ];

  return [
    {
      category: DisplayCategory.Search,
      icons: allResults,
    },
  ];
};

const getAllEmojis = ({
  skinTone,
  freqEmojis,
  customEmojis,
  freqCustomEmojis,
}: {
  skinTone: EmojiSkinTone;
  freqEmojis: string[];
  customEmojis: EmojiNode[];
  freqCustomEmojis: EmojiNode[];
}): DataNode[] => {
  const emojisWithCategory = getEmojisWithCategory({ skinTone });

  const getFrequentIcons = (): DataNode => {
    const emojis = getEmojis({ ids: freqEmojis, skinTone });

    // Combine frequent standard and custom emojis
    const allFrequent = [
      ...emojis.map((emoji) => ({
        type: IconType.Emoji as const,
        id: emoji.id,
        value: emoji.value,
      })),
      ...freqCustomEmojis,
    ];

    return {
      category: DisplayCategory.Frequent,
      icons: allFrequent,
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

  const getCustomEmojiData = (): DataNode | null => {
    if (customEmojis.length === 0) {
      return null;
    }
    return {
      category: "Custom",
      icons: customEmojis,
    };
  };

  const customData = getCustomEmojiData();
  const allData = concat(
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

  if (customData) {
    allData.push(customData);
  }

  return allData;
};

const toIcon = (emoji: Emoji): EmojiNode => ({
  type: IconType.Custom,
  id: emoji.id,
  value: emoji.id,
  name: emoji.name,
});

export default EmojiPanel;
