import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Flex from "~/components/Flex";
import InputSearch from "~/components/InputSearch";
import useStores from "~/hooks/useStores";
import GridTemplate, { DataNode } from "./GridTemplate";
import { IconType } from "@shared/types";
import {
  customEmojisFreqKey,
  DisplayCategory,
  FREQUENTLY_USED_COUNT,
  lastCustomEmojiKey,
} from "../utils";
import { getCustomEmojis } from "@shared/utils/emoji";
import usePersistedState from "~/hooks/usePersistedState";
import { isInternalUrl } from "@shared/utils/urls";

const GRID_HEIGHT = 410;

type Props = {
  panelWidth: number;
  height?: number;
  query: string;
  panelActive: boolean;
  onEmojiChange: (emoji: string) => void;
  onQueryChange: (query: string) => void;
};

const CustomEmojiPanel = ({
  query,
  panelActive,
  panelWidth,
  height = GRID_HEIGHT,
  onEmojiChange,
  onQueryChange,
}: Props) => {
  const { t } = useTranslation();
  const searchRef = React.useRef<HTMLInputElement | null>(null);
  const scrollableRef = React.useRef<HTMLDivElement | null>(null);
  const [searchData, setSearchData] = useState<DataNode[]>([]);
  const [emojisFreq, setEmojisFreq] = usePersistedState<Record<string, number>>(
    customEmojisFreqKey,
    {}
  );
  const [lastEmoji, setLastEmoji] = usePersistedState<string | undefined>(
    lastCustomEmojiKey,
    undefined
  );

  const { emojis } = useStores();

  const incrementEmojiCount = React.useCallback(
    (emoji: string) => {
      emojisFreq[emoji] = (emojisFreq[emoji] ?? 0) + 1;
      setEmojisFreq({ ...emojisFreq });
      setLastEmoji(emoji);
    },
    [emojisFreq, setEmojisFreq, setLastEmoji]
  );

  const handleFilter = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onQueryChange(event.target.value);
    },
    [onQueryChange, getCustomEmojis]
  );

  useEffect(() => {
    if (query) {
      getCustomEmojis(query).then((data) => {
        if (data?.length) {
          setSearchData([
            {
              category: DisplayCategory.Search,
              icons: data?.map((icon) => ({
                type: IconType.Custom,
                id: icon.name,
                value: icon.value,
              })),
            },
          ]);
          return;
        }
      });
    }

    setSearchData([]);
  }, [query]);

  const handleEmojiSelection = React.useCallback(
    // eslint-disable-next-line
    ({ id, value }: { id: string; value: string }) => {
      onEmojiChange(value);
      incrementEmojiCount(id + "-" + value);
    },
    [onEmojiChange, incrementEmojiCount]
  );

  const templateData: DataNode[] = React.useMemo(() => {
    const freqEmoji = getFrequentEmojis(emojisFreq, lastEmoji);

    return [
      {
        category: DisplayCategory.Frequent,
        icons: freqEmoji.map(({ id, value }) => ({
          type: IconType.Custom,
          id,
          value,
        })),
      },
      {
        category: DisplayCategory.All,
        icons: emojis.orderedData.map((emoji) => ({
          type: IconType.Custom,
          id: emoji.name,
          value: emoji.url,
        })),
      },
    ];
  }, [emojis.orderedData, emojisFreq]);

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
          placeholder={`${t("Search")}…`}
          onChange={handleFilter}
        />
      </UserInputContainer>
      <GridTemplate
        ref={scrollableRef}
        width={panelWidth}
        height={height - 48}
        data={searchData.length ? searchData : templateData}
        onIconSelect={handleEmojiSelection}
      />
    </Flex>
  );
};

const getFrequentEmojis = (
  emojisFreq: Record<string, number>,
  lastEmoji?: string
) => {
  const frequent = Object.entries(emojisFreq);

  const emojis = frequent
    .sort((a, b) => b[1] - a[1])
    .slice(0, FREQUENTLY_USED_COUNT.Track)
    .map(([nameUrl]) => {
      const index = nameUrl.indexOf("-");
      const id = nameUrl.substring(0, index);
      const value = nameUrl.substring(index + 1);

      return {
        id,
        value,
      };
    });

  const isLastPresent = emojis.some(
    (emoji) => lastEmoji && `${emoji.id}-${emoji.value}` === lastEmoji
  );

  if (lastEmoji && !isLastPresent) {
    const index = lastEmoji.indexOf("-");
    const id = lastEmoji.substring(0, index);
    const value = lastEmoji.substring(index + 1);

    emojis.pop();
    emojis.push({
      id,
      value,
    });
  }

  return emojis.filter((emoji) => isInternalUrl(emoji.value));
};

const StyledInputSearch = styled(InputSearch)`
  flex-grow: 1;
`;

const UserInputContainer = styled(Flex)`
  height: 48px;
  padding: 6px 12px 0px;
`;

export default CustomEmojiPanel;
