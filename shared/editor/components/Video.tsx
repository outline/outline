import * as React from "react";
import styled, { DefaultTheme, ThemeProps } from "styled-components";

type Props = {
  title: React.ReactNode;
  context?: React.ReactNode;
  href: string;
  isSelected: boolean;
  children?: React.ReactNode;
};

export default function Video(props: Props & ThemeProps<DefaultTheme>) {
  return (
    <Wrapper
      className={
        props.isSelected ? "ProseMirror-selectednode widget" : "widget"
      }
    >
      <NativeVideo src={props.href} controls />
      <Preview>
        <Title>{props.title}</Title>
      </Preview>
    </Wrapper>
  );
}

const NativeVideo = styled.video`
  max-width: 100%;
  border-radius: 8px;
`;

const Title = styled.strong`
  font-weight: 500;
  font-size: 14px;
  color: ${(props) => props.theme.text};
`;

const Preview = styled.div`
  gap: 8px;
  display: flex;
  flex-direction: row;
  flex-grow: 1;
  align-items: center;
  color: ${(props) => props.theme.textTertiary};
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
