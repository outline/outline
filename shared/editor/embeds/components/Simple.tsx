import * as React from "react";
import styled, { DefaultTheme, ThemeProps } from "styled-components";
import { EmbedProps as Props } from "../";

export default function Simple(props: Props & ThemeProps<DefaultTheme>) {
  return (
    <Wrapper
      className={props.isSelected ? "ProseMirror-selectednode" : ""}
      href={props.attrs.href}
      target="_blank"
      rel="noreferrer nofollow"
    >
      {props.embed.icon(undefined)}
      <Preview>
        <strong>{props.embed.title}</strong>
        <Subtitle>{props.attrs.href.replace(/^https?:\/\//, "")}</Subtitle>
      </Preview>
    </Wrapper>
  );
}

const Preview = styled.div`
  display: flex;
  flex-direction: column;
`;

const Subtitle = styled.span`
  font-size: 13px;
  color: ${(props) => props.theme.textTertiary} !important;
  line-height: 1.2;
  margin-bottom: 4px;
`;

const Wrapper = styled.a`
  display: inline-flex;
  align-items: flex-start;
  gap: 4px;
  color: ${(props) => props.theme.text} !important;
  background: ${(props) => props.theme.secondaryBackground};
  white-space: nowrap;
  border-radius: 8px;
  margin: 0.5em 0;
  padding: 6px 8px;
  max-width: 840px;
  width: 100%;

  text-overflow: ellipsis;
  overflow: hidden;

  &:hover {
    outline: 2px solid ${(props) => props.theme.divider};
  }
`;
