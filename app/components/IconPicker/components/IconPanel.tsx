import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { IconType } from "@shared/types";
import { IconLibrary } from "@shared/utils/IconLibrary";
import Flex from "~/components/Flex";
import InputSearch from "~/components/InputSearch";
import { DisplayCategory } from "../utils";
import IconColorPicker from "./IconColorPicker";
import type { DataNode, IconNode } from "./GridTemplate";
import GridTemplate from "./GridTemplate";
import { IconPreview, PREVIEW_HEIGHT } from "./IconPreview";
import { useIconState } from "../useIconState";

const IconNames = Object.keys(IconLibrary.mapping);
const TotalIcons = IconNames.length;

/**
 * This is needed as a constant for react-window.
 * Calculated from the heights of TabPanel, ColorPicker and InputSearch.
 */
const GRID_HEIGHT = 314 - PREVIEW_HEIGHT;

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

  const { incrementIconCount, frequentIcons } = useIconState(IconType.SVG);

  const totalFrequentIcons = frequentIcons.length;

  const filteredIcons = React.useMemo(
    () => IconLibrary.findIcons(query),
    [query]
  );

  const isSearch = query !== "";
  const category = isSearch ? DisplayCategory.Search : DisplayCategory.All;
  const delayPerIcon = 250 / (TotalIcons + totalFrequentIcons);

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

  const [activeIcon, setActiveIcon] = React.useState<string>();
  const [hasMoreBelow, setHasMoreBelow] = React.useState(false);

  const handleIconActive = React.useCallback((icon: IconNode) => {
    if (icon.type === IconType.SVG) {
      setActiveIcon(icon.name);
    }
  }, []);

  React.useEffect(() => {
    setActiveIcon(undefined);
  }, [query]);

  // Preview the first icon shown in the grid until the user hovers another.
  const previewIcon =
    activeIcon ??
    (isSearch ? filteredIcons[0] : (frequentIcons[0] ?? filteredIcons[0]));

  const baseIcons: DataNode = {
    category,
    icons: filteredIcons.map((name, index) => ({
      type: IconType.SVG,
      name,
      color,
      initial,
      delay: Math.round((index + totalFrequentIcons) * delayPerIcon),
      onClick: handleIconSelection,
    })),
  };

  const templateData: DataNode[] = isSearch
    ? [baseIcons]
    : [
        {
          category: DisplayCategory.Frequent,
          icons: frequentIcons.map((name, index) => ({
            type: IconType.SVG,
            name,
            color,
            initial,
            delay: Math.round((index + totalFrequentIcons) * delayPerIcon),
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
        onIconActive={handleIconActive}
        onOverflowChange={setHasMoreBelow}
      />
      <IconPreview
        showFade={hasMoreBelow}
        icon={
          previewIcon
            ? {
                type: IconType.SVG,
                name: previewIcon,
                color,
                initial,
                delay: 0,
              }
            : undefined
        }
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
