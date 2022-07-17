import * as React from "react";
import styled, { DefaultTheme, ThemeProps } from "styled-components";

type Props = {
  title: string;
  href: string;
  isSelected: boolean;
};

export default function Video(props: Props & ThemeProps<DefaultTheme>) {
  return (
    <Wrapper className={props.isSelected ? "ProseMirror-selectednode" : ""}>
      <NativeVideo src={props.href} title={props.title} controls />
    </Wrapper>
  );
}

const NativeVideo = styled.video`
  max-width: 100%;
  border-radius: 8px;
`;

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 0 0 1px ${(props) => props.theme.divider};
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text} !important;
  white-space: nowrap;
  border-radius: 8px;
  max-width: 840px;
  cursor: default;

  user-select: none;
  text-overflow: ellipsis;
  overflow: hidden;
`;
