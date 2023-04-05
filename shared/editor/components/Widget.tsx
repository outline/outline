import * as React from "react";
import styled, { css, DefaultTheme, ThemeProps } from "styled-components";

type Props = {
  icon: React.ReactNode;
  title: React.ReactNode;
  context?: React.ReactNode;
  href: string;
  isSelected: boolean;
  children?: React.ReactNode;
};

export default function Widget(props: Props & ThemeProps<DefaultTheme>) {
  return (
    <Wrapper
      className={
        props.isSelected ? "ProseMirror-selectednode widget" : "widget"
      }
      href={props.href}
      rel="noreferrer nofollow"
    >
      {props.icon}
      <Preview>
        <Title>{props.title}</Title>
        <Subtitle>{props.context}</Subtitle>
        <Children>{props.children}</Children>
      </Preview>
    </Wrapper>
  );
}

const Children = styled.div`
  margin-left: auto;
  height: 20px;
  opacity: 0;

  &:hover {
    color: ${(props) => props.theme.text};
  }
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

const Subtitle = styled.span`
  font-size: 13px;
  color: ${(props) => props.theme.textTertiary} !important;
  line-height: 0;
`;

const Wrapper = styled.a`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text} !important;
  box-shadow: 0 0 0 1px ${(props) => props.theme.divider};
  white-space: nowrap;
  border-radius: 8px;
  padding: 6px 8px;
  max-width: 840px;
  cursor: default;

  user-select: none;
  text-overflow: ellipsis;
  overflow: hidden;

  ${(props) =>
    props.href &&
    css`
      &:hover,
      &:active {
        cursor: pointer !important;
        text-decoration: none !important;
        background: ${(props) => props.theme.secondaryBackground};

        ${Children} {
          opacity: 1;
        }
      }
    `}
`;
