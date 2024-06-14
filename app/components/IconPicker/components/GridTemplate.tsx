import chunk from "lodash/chunk";
import compact from "lodash/compact";
import React from "react";
import styled from "styled-components";
import { IconLibrary } from "@shared/utils/IconLibrary";
import Text from "~/components/Text";
import { Emoji } from "./Emoji";
import Grid from "./Grid";
import { IconButton } from "./IconButton";

/**
 * icon/emoji size is 24px; and we add 4px padding on all sides,
 */
const BUTTON_SIZE = 32;

type OutlineNode = {
  type: "outline";
  name: string;
  color: string;
  initial: string;
  onClick: (icon: string) => void;
  delay: number;
};

type EmojiNode = {
  type: "emoji";
  id: string;
  value: string;
  onClick: ({ id, value }: { id: string; value: string }) => void;
};

export type DataNode = {
  category: string;
  icons: (OutlineNode | EmojiNode)[];
};

type Props = {
  width: number;
  height: number;
  data: DataNode[];
};

const GridTemplate = (
  { width, height, data }: Props,
  ref: React.Ref<HTMLDivElement>
) => {
  // 24px padding for the Grid Container
  const itemsPerRow = Math.floor((width - 24) / BUTTON_SIZE);

  const gridItems = compact(
    data.flatMap((node) => {
      if (node.icons.length === 0) {
        return [];
      }

      const category = (
        <CategoryName
          key={node.category}
          type="tertiary"
          size="xsmall"
          weight="bold"
        >
          {node.category}
        </CategoryName>
      );

      const items = node.icons.map((item) => {
        if (item.type === "outline") {
          return (
            <IconButton
              key={item.name}
              onClick={() => item.onClick(item.name)}
              delay={item.delay}
            >
              <Icon as={IconLibrary.getComponent(item.name)} color={item.color}>
                {item.initial}
              </Icon>
            </IconButton>
          );
        }

        return (
          <IconButton
            key={item.id}
            onClick={() => item.onClick({ id: item.id, value: item.value })}
          >
            <Emoji>{item.value}</Emoji>
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
      itemWidth={BUTTON_SIZE}
    />
  );
};

const CategoryName = styled(Text)`
  grid-column: 1 / -1;
  padding-left: 6px;
`;

const Icon = styled.svg`
  transition: color 150ms ease-in-out, fill 150ms ease-in-out;
  transition-delay: var(--delay);
`;

export default React.forwardRef(GridTemplate);
