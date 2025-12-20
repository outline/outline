import concat from "lodash/concat";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import type { EmojiSkinTone } from "@shared/types";
import { EmojiCategory, IconType } from "@shared/types";
import { getEmojis, getEmojisWithCategory, search } from "@shared/utils/emoji";
import Flex from "~/components/Flex";
import { EmojiCreateDialog } from "~/components/EmojiCreateDialog";
import { DisplayCategory } from "../utils";
import type { DataNode, EmojiNode } from "./GridTemplate";
import GridTemplate from "./GridTemplate";
import SkinTonePicker from "./SkinTonePicker";
import { StyledInputSearch, UserInputContainer } from "./Components";
import { useIconState } from "../useIconState";
import useStores from "~/hooks/useStores";
import type Emoji from "~/models/Emoji";
import { useComputed } from "~/hooks/useComputed";
import { MenuButton } from "./MenuButton";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import { IconButton } from "./IconButton";

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
  const { emojis, dialogs } = useStores();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const searchRef = React.useRef<HTMLInputElement | null>(null);
  const scrollableRef = React.useRef<HTMLDivElement | null>(null);
  const customEmojis = useComputed(
    () => emojis.orderedData.map(toIcon),
    [emojis.orderedData]
  );

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

  const handleUploadClick = React.useCallback(() => {
    dialogs.openModal({
      title: t("Upload emoji"),
      content: <EmojiCreateDialog onSubmit={dialogs.closeAllModals} />,
    });
  }, [dialogs, t]);

  const handleEmojiSelection = React.useCallback(
    ({ id, value }: { id: string; value: string }) => {
      onEmojiChange(value);

      // Determine if this is a custom emoji by checking if it's in the custom emoji data
      const isCustomEmoji =
        customEmojis.some((emoji) => emoji.id === id) ||
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
      customEmojis,
      freqCustomEmojis,
    ]
  );

  React.useEffect(() => {
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
        customEmojis,
      })
    : getAllEmojis({
        skinTone,
        freqEmojis,
        customEmojis,
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
      <UserInputContainer>
        <StyledInputSearch
          ref={searchRef}
          value={query}
          placeholder={`${t("Search emoji")}…`}
          onChange={handleFilter}
        />
        <SkinTonePicker skinTone={skinTone} onChange={handleSkinChange} />
        {can.update && (
          <MenuButton
            onClick={handleUploadClick}
            aria-label={t("Upload emoji")}
          >
            <PlusIcon />
          </MenuButton>
        )}
      </UserInputContainer>
      <GridTemplate
        ref={scrollableRef}
        width={panelWidth}
        height={height - 48}
        data={templateData}
        onIconSelect={handleEmojiSelection}
        empty={
          <IconButton onClick={handleUploadClick}>
            <PlusIcon />
          </IconButton>
        }
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
    ...matchingCustomEmojis,
    ...emojis.map((emoji) => ({
      type: IconType.Emoji as const,
      id: emoji.id,
      value: emoji.value,
    })),
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

  if (customEmojis.length) {
    allData.push({
      category: "Custom",
      icons: customEmojis,
    });
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
