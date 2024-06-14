import concat from "lodash/concat";
import React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { EmojiCategory, EmojiSkin } from "@shared/types";
import { getEmojis, getEmojisWithCategory, search } from "@shared/utils/emoji";
import Flex from "~/components/Flex";
import InputSearch from "~/components/InputSearch";
import usePersistedState from "~/hooks/usePersistedState";
import {
  FREQUENTLY_USED_COUNT,
  IconCategory,
  getEmojiSkinKey,
  getEmojisFreqKey,
  getLastEmojiKey,
  sortFrequencies,
} from "../utils";
import GridTemplate, { DataNode } from "./GridTemplate";
import SkinPicker from "./SkinPicker";

/**
 * This is needed as a constant for react-window.
 * Calculated from the heights of TabPanel and InputSearch.
 */
const GRID_HEIGHT = 362;

const useEmojiState = () => {
  const [emojiSkin, setEmojiSkin] = usePersistedState<EmojiSkin>(
    getEmojiSkinKey(),
    EmojiSkin.Default
  );
  const [emojisFreq, setEmojisFreq] = usePersistedState<Record<string, number>>(
    getEmojisFreqKey(),
    {}
  );
  const [lastEmoji, setLastEmoji] = usePersistedState<string | undefined>(
    getLastEmojiKey(),
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
    emojiSkin,
    setEmojiSkin,
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
    emojiSkin: skin,
    setEmojiSkin,
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
    (emojiSkin: EmojiSkin) => {
      setEmojiSkin(emojiSkin);
    },
    [setEmojiSkin]
  );

  const handleEmojiClick = React.useCallback(
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
        skin,
        onClick: handleEmojiClick,
      })
    : getAllEmojis({
        skin,
        freqEmojis,
        onClick: handleEmojiClick,
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
        <SkinPicker skin={skin} onChange={handleSkinChange} />
      </UserInputContainer>
      <GridTemplate
        ref={scrollableRef}
        width={panelWidth}
        height={GRID_HEIGHT}
        data={templateData}
      />
    </Flex>
  );
};

const getSearchResults = ({
  query,
  skin,
  onClick,
}: {
  query: string;
  skin: EmojiSkin;
  onClick: (props: { id: string; value: string }) => void;
}): DataNode[] => {
  const emojis = search({ query, skin });
  return [
    {
      category: IconCategory.Search,
      icons: emojis.map((emoji) => ({
        type: "emoji",
        id: emoji.id,
        value: emoji.value,
        onClick,
      })),
    },
  ];
};

const getAllEmojis = ({
  skin,
  freqEmojis,
  onClick,
}: {
  skin: EmojiSkin;
  freqEmojis: string[];
  onClick: (props: { id: string; value: string }) => void;
}): DataNode[] => {
  const getFrequentEmojis = (): DataNode => {
    const emojis = getEmojis({ ids: freqEmojis, skin });
    return {
      category: IconCategory.Frequent,
      icons: emojis.map((emoji) => ({
        type: "emoji",
        id: emoji.id,
        value: emoji.value,
        onClick,
      })),
    };
  };

  const getCategoryData = (emojiCategory: EmojiCategory): DataNode => {
    const emojis = getEmojisWithCategory({ skin })[emojiCategory];
    return {
      category: emojiCategory,
      icons: emojis.map((emoji) => ({
        type: "emoji",
        id: emoji.id,
        value: emoji.value,
        onClick,
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
