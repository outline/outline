import React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Flex from "~/components/Flex";
import InputSearch from "~/components/InputSearch";
import useStores from "~/hooks/useStores";
import GridTemplate, { DataNode } from "./GridTemplate";
import { IconType } from "@shared/types";
import { DisplayCategory } from "../utils";

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

  const { emojis } = useStores();

  // to do: custom emoji search
  const handleFilter = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onQueryChange(event.target.value);
    },
    [onQueryChange]
  );

  // to do: frequent custom emoji
  const handleEmojiSelection = React.useCallback(
    // eslint-disable-next-line
    ({ id, value }: { id: string; value: string }) => {
      onEmojiChange(value);
      // incrementEmojiCount(id);
    },
    [
      onEmojiChange,
      // incrementEmojiCount
    ]
  );

  const templateData: DataNode[] = React.useMemo(
    () => [
      {
        category: DisplayCategory.All,
        icons: emojis.orderedData.map((emoji) => ({
          type: IconType.Custom,
          id: emoji.name,
          value: emoji.url,
        })),
      },
    ],
    [emojis.orderedData]
  );

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
        data={templateData}
        onIconSelect={handleEmojiSelection}
      />
    </Flex>
  );
};

const StyledInputSearch = styled(InputSearch)`
  flex-grow: 1;
`;

const UserInputContainer = styled(Flex)`
  height: 48px;
  padding: 6px 12px 0px;
`;

export default CustomEmojiPanel;
