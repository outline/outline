import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { IconType } from "@shared/types";
import { IconLibrary } from "@shared/utils/IconLibrary";
import Flex from "~/components/Flex";
import InputSearch from "~/components/InputSearch";
import { DisplayCategory } from "../utils";
import IconColorPicker from "./IconColorPicker";
import type { DataNode } from "./GridTemplate";
import GridTemplate from "./GridTemplate";
import { useIconState } from "../useIconState";

const IconNames = Object.keys(IconLibrary.mapping);
const TotalIcons = IconNames.length;

/**
 * This is needed as a constant for react-window.
 * Calculated from the heights of TabPanel, ColorPicker and InputSearch.
 */
const GRID_HEIGHT = 314;

type Props = {
  panelWidth: number;
  initial: string;
  color: string;
  query: string;
  panelActive: boolean;
  onIconChange: (icon: string) => void;
  onColorChange: (icon: string) => void;
  onQueryChange: (query: string) => void;
};

const IconPanel = ({
  panelWidth,
  initial,
  color,
  query,
  panelActive,
  onIconChange,
  onColorChange,
  onQueryChange,
}: Props) => {
  const { t } = useTranslation();

  const searchRef = React.useRef<HTMLInputElement | null>(null);
  const scrollableRef = React.useRef<HTMLDivElement | null>(null);

  const { incrementIconCount, getFrequentIcons } = useIconState(IconType.SVG);

  const freqIcons = React.useMemo(() => getFrequentIcons(), [getFrequentIcons]);
  const totalFreqIcons = freqIcons.length;

  const filteredIcons = React.useMemo(
    () => IconLibrary.findIcons(query),
    [query]
  );

  const isSearch = query !== "";
  const category = isSearch ? DisplayCategory.Search : DisplayCategory.All;
  const delayPerIcon = 250 / (TotalIcons + totalFreqIcons);

  const handleFilter = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onQueryChange(event.target.value);
    },
    [onQueryChange]
  );

  const handleIconSelection = React.useCallback(
    ({ id, value }: { id: string; value: string }) => {
      onIconChange(value);
      incrementIconCount(id);
    },
    [onIconChange, incrementIconCount]
  );

  const baseIcons: DataNode = {
    category,
    icons: filteredIcons.map((name, index) => ({
      type: IconType.SVG,
      name,
      color,
      initial,
      delay: Math.round((index + totalFreqIcons) * delayPerIcon),
      onClick: handleIconSelection,
    })),
  };

  const templateData: DataNode[] = isSearch
    ? [baseIcons]
    : [
        {
          category: DisplayCategory.Frequent,
          icons: freqIcons.map((name, index) => ({
            type: IconType.SVG,
            name,
            color,
            initial,
            delay: Math.round((index + totalFreqIcons) * delayPerIcon),
            onClick: handleIconSelection,
          })),
        },
        baseIcons,
      ];

  React.useLayoutEffect(() => {
    if (!panelActive) {
      return;
    }
    scrollableRef.current?.scroll({ top: 0 });
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [panelActive]);

  return (
    <Flex column>
      <InputSearchContainer align="center">
        <StyledInputSearch
          ref={searchRef}
          value={query}
          placeholder={`${t("Search icons")}…`}
          onChange={handleFilter}
        />
      </InputSearchContainer>
      <IconColorPicker
        width={panelWidth}
        activeColor={color}
        onSelect={onColorChange}
      />
      <GridTemplate
        ref={scrollableRef}
        width={panelWidth}
        height={GRID_HEIGHT}
        data={templateData}
        onIconSelect={handleIconSelection}
      />
    </Flex>
  );
};

const InputSearchContainer = styled(Flex)`
  height: 48px;
  padding: 6px 12px 0px;
`;

const StyledInputSearch = styled(InputSearch)`
  flex-grow: 1;
`;

export default IconPanel;
