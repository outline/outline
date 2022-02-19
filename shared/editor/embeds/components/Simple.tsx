import { OpenIcon } from "outline-icons";
import * as React from "react";
import styled, { DefaultTheme, ThemeProps } from "styled-components";
import { EmbedProps as Props } from "../";

export default function Simple(props: Props & ThemeProps<DefaultTheme>) {
  return (
    <Wrapper
      className={
        props.isSelected
          ? "ProseMirror-selectednode disabled-embed"
          : "disabled-embed"
      }
      href={props.attrs.href}
      target="_blank"
      rel="noreferrer nofollow"
    >
      {props.embed.icon(undefined)}
      <Preview>
        <Title>{props.embed.title}</Title>
        <Subtitle>{props.attrs.href.replace(/^https?:\/\//, "")}</Subtitle>
        <StyledOpenIcon color="currentColor" size={20} />
      </Preview>
    </Wrapper>
  );
}

const StyledOpenIcon = styled(OpenIcon)`
  margin-left: auto;
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
`;

const Wrapper = styled.a`
  display: inline-flex;
  align-items: flex-start;
  gap: 4px;
  box-sizing: border-box !important;
  color: ${(props) => props.theme.text} !important;
  background: ${(props) => props.theme.secondaryBackground};
  white-space: nowrap;
  border-radius: 8px;
  padding: 6px 8px;
  max-width: 840px;
  width: 100%;
  text-overflow: ellipsis;
  overflow: hidden;

  &:hover {
    text-decoration: none !important;
    outline: 2px solid ${(props) => props.theme.divider};
  }
`;
