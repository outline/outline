import { chunk, compact } from "es-toolkit/compat";
import * as React from "react";
import styled from "styled-components";
import { IconType } from "@shared/types";
import { IconLibrary } from "@shared/utils/IconLibrary";
import { Emoji } from "~/components/Emoji";
import Text from "~/components/Text";
import useMobile from "~/hooks/useMobile";
import { TRANSLATED_CATEGORIES } from "../utils";
import Grid from "./Grid";
import { IconButton } from "./IconButton";
import { CustomEmoji } from "@shared/components/CustomEmoji";

/**
 * Desktop: 24px icon/emoji + 4px padding on all sides = 32px button.
 * Mobile: 32px icon/emoji + 4px padding on all sides = 40px button, so
 * roughly 8 emojis fit across a typical phone screen.
 */
const BUTTON_SIZE_DESKTOP = 32;
const BUTTON_SIZE_MOBILE = 40;
const ICON_SIZE_DESKTOP = 24;
const ICON_SIZE_MOBILE = 32;

type OutlineNode = {
  type: IconType.SVG;
  name: string;
  color: string;
  initial: string;
  delay: number;
};

export type EmojiNode = {
  type: IconType.Emoji | IconType.Custom;
  id: string;
  value: string;
  name?: string;
};

export type DataNode = {
  category: keyof typeof TRANSLATED_CATEGORIES;
  icons: (OutlineNode | EmojiNode)[];
};

type Props = {
  /** Width of the grid container */
  width: number;
  /** Height of the grid container */
  height: number;
  /** Data to be displayed in the grid */
  data: DataNode[];
  /** Content to display when search results are empty */
  empty?: React.ReactNode;
  /** Callback when an icon is selected */
  onIconSelect: ({ id, value }: { id: string; value: string }) => void;
};

const GridTemplate = (
  { width, height, data, empty, onIconSelect }: Props,
  ref: React.Ref<HTMLDivElement>
) => {
  const isMobile = useMobile();
  const buttonSize = isMobile ? BUTTON_SIZE_MOBILE : BUTTON_SIZE_DESKTOP;
  const iconSize = isMobile ? ICON_SIZE_MOBILE : ICON_SIZE_DESKTOP;
  // 24px padding for the Grid Container
  const itemsPerRow = Math.max(1, Math.floor((width - 24) / buttonSize));

  const gridItems = compact(
    data.flatMap((node) => {
      const category = (
        <CategoryName
          key={node.category}
          type="tertiary"
          size="xsmall"
          weight="bold"
        >
          {TRANSLATED_CATEGORIES[node.category]}
        </CategoryName>
      );

      if (node.icons.length === 0) {
        if (node.category !== "Search") {
          return [];
        }
        return [[category], [empty]];
      }

      const items = node.icons.map((item) => {
        if (item.type === IconType.SVG) {
          return (
            <IconButton
              key={item.name}
              onClick={() => onIconSelect({ id: item.name, value: item.name })}
              style={{ "--delay": `${item.delay}ms` } as React.CSSProperties}
            >
              <Icon
                as={IconLibrary.getComponent(item.name)}
                color={item.color}
                size={iconSize}
              >
                {item.initial}
              </Icon>
            </IconButton>
          );
        }

        return (
          <IconButton
            key={item.id}
            onClick={() => onIconSelect({ id: item.id, value: item.value })}
          >
            <Emoji
              width={iconSize}
              height={iconSize}
              size={isMobile ? iconSize : undefined}
            >
              {item.type === IconType.Custom ? (
                <CustomEmoji value={item.value} title={item.name} />
              ) : (
                item.value
              )}
            </Emoji>
          </IconButton>
        );
      });

      const chunks = chunk(items, itemsPerRow);
      return [[category], ...chunks];
    })
  );

  return (
    <Grid
      ref={ref}
      width={width}
      height={height}
      data={gridItems}
      columns={itemsPerRow}
      itemWidth={buttonSize}
    />
  );
};

const CategoryName = styled(Text)`
  grid-column: 1 / -1;
  padding-left: 6px;
`;

const Icon = styled.svg`
  transition:
    color 150ms ease-in-out,
    fill 150ms ease-in-out;
  transition-delay: var(--delay);
`;

export default React.forwardRef(GridTemplate);
