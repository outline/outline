import React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { IconType } from "@shared/types";
import { IconLibrary } from "@shared/utils/IconLibrary";
import Flex from "~/components/Flex";
import InputSearch from "~/components/InputSearch";
import usePersistedState from "~/hooks/usePersistedState";
import {
  FREQUENTLY_USED_COUNT,
  DisplayCategory,
  iconsFreqKey,
  lastIconKey,
  sortFrequencies,
} from "../utils";
import ColorPicker from "./ColorPicker";
import GridTemplate, { DataNode } from "./GridTemplate";

const IconNames = Object.keys(IconLibrary.mapping);
const TotalIcons = IconNames.length;

/**
 * This is needed as a constant for react-window.
 * Calculated from the heights of TabPanel, ColorPicker and InputSearch.
 */
const GRID_HEIGHT = 314;

const useIconState = () => {
  const [iconsFreq, setIconsFreq] = usePersistedState<Record<string, number>>(
    iconsFreqKey,
    {}
  );
  const [lastIcon, setLastIcon] = usePersistedState<string | undefined>(
    lastIconKey,
    undefined
  );

  const incrementIconCount = React.useCallback(
    (icon: string) => {
      iconsFreq[icon] = (iconsFreq[icon] ?? 0) + 1;
      setIconsFreq({ ...iconsFreq });
      setLastIcon(icon);
    },
    [iconsFreq, setIconsFreq, setLastIcon]
  );

  const getFreqIcons = React.useCallback(() => {
    const freqs = Object.entries(iconsFreq);

    if (freqs.length > FREQUENTLY_USED_COUNT.Track) {
      sortFrequencies(freqs).splice(FREQUENTLY_USED_COUNT.Track);
      setIconsFreq(Object.fromEntries(freqs));
    }

    const icons = sortFrequencies(freqs)
      .slice(0, FREQUENTLY_USED_COUNT.Get)
      .map(([icon, _]) => icon);

    const isLastPresent = icons.includes(lastIcon ?? "");
    if (lastIcon && !isLastPresent) {
      icons.pop();
      icons.push(lastIcon);
    }

    return icons;
  }, [iconsFreq, setIconsFreq, lastIcon]);

  return {
    incrementIconCount,
    getFreqIcons,
  };
};

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

  const { incrementIconCount, getFreqIcons } = useIconState();

  const freqIcons = React.useMemo(() => getFreqIcons(), [getFreqIcons]);
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
      type: IconType.Outline,
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
            type: IconType.Outline,
            name,
            color,
            initial,
            delay: Math.round((index + totalFreqIcons) * delayPerIcon),
            onClick: handleIconSelection,
          })),
        },
        baseIcons,
      ];

  React.useEffect(() => {
    if (scrollableRef.current) {
      scrollableRef.current.scrollTop = 0;
    }
    searchRef.current?.focus();
  }, [panelActive]);

  return (
    <Flex column gap={8}>
      <ColorPicker
        width={panelWidth}
        activeColor={color}
        onSelect={onColorChange}
      />
      <StyledInputSearch
        ref={searchRef}
        value={query}
        placeholder={`${t("Search icons")}…`}
        onChange={handleFilter}
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

const StyledInputSearch = styled(InputSearch)`
  padding: 0px 12px;
`;

export default IconPanel;
