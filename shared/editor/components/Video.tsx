import * as React from "react";
import styled from "styled-components";

type Props = {
  title: string;
  width: string;
  height: string;
  src: string;
  isSelected: boolean;
};

export default function Video(props: Props) {
  return (
    <Wrapper>
      <StyledVideo
        src={props.src}
        title={props.title}
        width={props.width}
        height={props.height}
        className={props.isSelected ? "ProseMirror-selectednode" : ""}
        controls
      />
    </Wrapper>
  );
}

const StyledVideo = styled.video`
  max-width: 840px;
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text} !important;
  margin: -2px;
  padding: 2px;
  border-radius: 8px;
  box-shadow: 0 0 0 1px ${(props) => props.theme.divider};
`;

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  cursor: default;
  border-radius: 8px;
  user-select: none;
  max-width: 100%;
`;
