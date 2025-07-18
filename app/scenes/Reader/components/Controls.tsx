import * as React from "react";
import styled from "styled-components";

type Props = {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  page: number;
  numPages: number;
  onNextPage: () => void;
  onPrevPage: () => void;
};

function Controls({
  zoom,
  onZoomIn,
  onZoomOut,
  page,
  numPages,
  onNextPage,
  onPrevPage,
}: Props) {
  return (
    <Bar>
      <Button onClick={onZoomOut}>-</Button>
      <Zoom>{Math.round(zoom * 100)}%</Zoom>
      <Button onClick={onZoomIn}>+</Button>
      <Separator />
      <Button onClick={onPrevPage}>‹</Button>
      <PageInfo>
        {page} / {numPages}
      </PageInfo>
      <Button onClick={onNextPage}>›</Button>
    </Bar>
  );
}

const Bar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  background: #eee;
`;

const Button = styled.button`
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
`;

const Zoom = styled.div`
  margin: 0 10px;
`;

const Separator = styled.div`
  width: 1px;
  height: 20px;
  margin: 0 10px;
  background: #ccc;
`;

const PageInfo = styled.div`
  margin: 0 10px;
`;

export default Controls;
