import React from "react";
import type { ListImperativeAPI, RowComponentProps } from "react-window";
import { List } from "react-window";
import styled from "styled-components";

type Props = {
  width: number;
  height: number;
  data: React.ReactNode[][];
  columns: number;
  itemWidth: number;
  onOverflowChange?: (hasMoreBelow: boolean) => void;
  ref?: React.Ref<ListImperativeAPI>;
};

function Grid({
  width,
  height,
  data,
  columns,
  itemWidth,
  onOverflowChange,
  ref,
}: Props) {
  const offsetRef = React.useRef(0);
  const maxOffset = Math.max(0, data.length * itemWidth - height);

  const notify = React.useCallback(() => {
    onOverflowChange?.(offsetRef.current < maxOffset - 1);
  }, [onOverflowChange, maxOffset]);

  // The amount of scrollable content changes as rows are added or removed.
  React.useEffect(notify, [notify]);

  const handleScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      offsetRef.current = event.currentTarget.scrollTop;
      notify();
    },
    [notify]
  );

  const style = React.useMemo(() => ({ width, height }), [width, height]);
  const rowProps = React.useMemo(() => ({ data, columns }), [data, columns]);

  return (
    <Container
      listRef={ref}
      style={style}
      rowCount={data.length}
      rowHeight={itemWidth}
      rowComponent={Row}
      rowProps={rowProps}
      onScroll={handleScroll}
    />
  );
}

type RowProps = {
  data: React.ReactNode[][];
  columns: number;
};

const Row = ({
  index,
  style,
  ariaAttributes,
  data,
  columns,
}: RowComponentProps<RowProps>) => (
  <RowContainer style={style} columns={columns} {...ariaAttributes}>
    {data[index]}
  </RowContainer>
);

const Container = styled(List<RowProps>)`
  overflow-x: hidden !important;
`;

// Rows are absolutely positioned, so the horizontal padding lives here.
const RowContainer = styled.div<{ columns: number }>`
  display: grid;
  grid-template-columns: ${({ columns }) => `repeat(${columns}, 1fr)`};
  align-content: center;
  padding: 0 12px;
`;

export default Grid;
