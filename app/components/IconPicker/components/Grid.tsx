import React from "react";
import type { ListChildComponentProps } from "react-window";
import { FixedSizeList } from "react-window";
import styled from "styled-components";

type Props = {
  width: number;
  height: number;
  data: React.ReactNode[][];
  columns: number;
  itemWidth: number;
  onOverflowChange?: (hasMoreBelow: boolean) => void;
};

const Grid = (
  { width, height, data, columns, itemWidth, onOverflowChange }: Props,
  ref: React.Ref<HTMLDivElement>
) => {
  const offsetRef = React.useRef(0);
  const maxOffset = Math.max(0, data.length * itemWidth - height);

  const notify = React.useCallback(() => {
    onOverflowChange?.(offsetRef.current < maxOffset - 1);
  }, [onOverflowChange, maxOffset]);

  // The amount of scrollable content changes as rows are added or removed.
  React.useEffect(notify, [notify]);

  const handleScroll = React.useCallback(
    ({ scrollOffset }: { scrollOffset: number }) => {
      offsetRef.current = scrollOffset;
      notify();
    },
    [notify]
  );

  return (
    <Container
      outerRef={ref}
      width={width}
      height={height}
      itemCount={data.length}
      itemSize={itemWidth}
      itemData={{ data, columns }}
      onScroll={handleScroll}
    >
      {Row}
    </Container>
  );
};

type RowProps = {
  data: React.ReactNode[][];
  columns: number;
};

const Row = ({ index, style, data }: ListChildComponentProps<RowProps>) => {
  const { data: rows, columns } = data;
  const row = rows[index];

  return (
    <RowContainer style={style} columns={columns}>
      {row}
    </RowContainer>
  );
};

const Container = styled(FixedSizeList<RowProps>)`
  padding: 0px 12px;
  overflow-x: hidden !important;

  // Needed for the absolutely positioned children
  // to respect the VirtualList's padding
  & > div {
    position: relative;
  }
`;

const RowContainer = styled.div<{ columns: number }>`
  display: grid;
  grid-template-columns: ${({ columns }) => `repeat(${columns}, 1fr)`};
  align-content: center;
`;

export default React.forwardRef(Grid);
