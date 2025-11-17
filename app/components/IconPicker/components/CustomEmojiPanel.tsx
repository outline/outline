import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Flex from "~/components/Flex";
import useStores from "~/hooks/useStores";
import GridTemplate, { DataNode, EmojiNode } from "./GridTemplate";
import { IconType } from "@shared/types";
import { DisplayCategory } from "../utils";
import { isInternalUrl } from "@shared/utils/urls";
import { StyledInputSearch, UserInputContainer } from "./Components";
import { useIconState } from "../useIconState";
import Emoji from "~/models/Emoji";

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
  const { getFrequentIcons, incrementIconCount } = useIconState(
    IconType.Custom
  );

  const { emojis } = useStores();

  const handleFilter = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onQueryChange(event.target.value);
    },
    [onQueryChange]
  );

  useEffect(() => {
    if (query) {
      const initialData = emojis.findByQuery(query);
      if (initialData.length) {
        setSearchData([
          {
            category: DisplayCategory.Search,
            icons: initialData?.map((icon) => ({
              type: IconType.Custom,
              id: icon.name,
              value: icon.url,
            })),
          },
        ]);
      }

      emojis
        .fetchAll({
          query,
        })
        .then((data) => {
          if (data.length) {
            const toIcon = (emoji: Emoji): EmojiNode => ({
              type: IconType.Custom,
              id: emoji.name,
              value: emoji.url,
            });

            const iconMap = new Map([
              ...initialData.map((emoji): [string, EmojiNode] => [
                emoji.name,
                toIcon(emoji),
              ]),
              ...data.map((emoji): [string, EmojiNode] => [
                emoji.name,
                toIcon(emoji),
              ]),
            ]);

            setSearchData([
              {
                category: DisplayCategory.Search,
                icons: Array.from(iconMap.values()),
              },
            ]);
            return;
          }

          setSearchData([]);
        });
    } else {
      setSearchData([]);
    }
  }, [query]);

  const handleEmojiSelection = React.useCallback(
    // eslint-disable-next-line
    ({ id, value }: { id: string; value: string }) => {
      onEmojiChange(value);
      incrementIconCount(id + "-" + value);
    },
    [onEmojiChange, incrementIconCount]
  );

  const templateData: DataNode[] = React.useMemo(() => {
    const freqEmoji = getFrequentIcons()
      .map((nameUrl) => {
        const index = nameUrl.indexOf("-");
        const id = nameUrl.substring(0, index);
        const value = nameUrl.substring(index + 1);

        return {
          type: IconType.Custom as IconType.Custom | IconType.Custom,
          id,
          value,
        };
      })
      .filter((emoji) => isInternalUrl(emoji.value));

    return [
      {
        category: DisplayCategory.Frequent,
        icons: freqEmoji,
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
  }, [emojis.orderedData, getFrequentIcons]);

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

export default CustomEmojiPanel;
