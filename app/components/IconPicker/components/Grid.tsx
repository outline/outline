import React from "react";
import { FixedSizeList, ListChildComponentProps } from "react-window";
import styled from "styled-components";

type Props = {
  width: number;
  height: number;
  data: React.ReactNode[][];
  columns: number;
  itemWidth: number;
};

const Grid = (
  { width, height, data, columns, itemWidth }: Props,
  ref: React.Ref<HTMLDivElement>
) => (
  <Container
    outerRef={ref}
    width={width}
    height={height}
    itemCount={data.length}
    itemSize={itemWidth}
    itemData={{ data, columns }}
  >
    {Row}
  </Container>
);

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
