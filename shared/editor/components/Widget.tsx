import * as React from "react";
import styled, { css, DefaultTheme, ThemeProps } from "styled-components";
import { s } from "../../styles";
import { sanitizeUrl } from "../../utils/urls";

type Props = {
  /** Icon to display on the left side of the widget */
  icon: React.ReactNode;
  /** Title of the widget */
  title: React.ReactNode;
  /** Context, displayed to right of title */
  context?: React.ReactNode;
  /** URL to open when the widget is clicked */
  href: string;
  /** Whether the widget is currently selected */
  isSelected: boolean;
  /** Children to display to the right of the context */
  children?: React.ReactNode;
  /** Callback fired when the widget is double clicked */
  onDoubleClick?: React.MouseEventHandler<HTMLAnchorElement>;
  /** Callback fired when the widget is clicked */
  onMouseDown?: React.MouseEventHandler<HTMLAnchorElement>;
  /** Callback fired when the widget is clicked */
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

export default function Widget(props: Props & ThemeProps<DefaultTheme>) {
  const className = props.isSelected
    ? "ProseMirror-selectednode widget"
    : "widget";

  return (
    <Wrapper
      className={className}
      target="_blank"
      href={sanitizeUrl(props.href)}
      rel="noreferrer nofollow"
      onDoubleClick={props.onDoubleClick}
      onMouseDown={props.onMouseDown}
      onClick={props.onClick}
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
    color: ${s("text")};
  }
`;

const Title = styled.strong`
  font-weight: 500;
  font-size: 14px;
  color: ${s("text")};
`;

const Preview = styled.div`
  gap: 8px;
  display: flex;
  flex-direction: row;
  flex-grow: 1;
  align-items: center;
  color: ${s("textTertiary")};
`;

const Subtitle = styled.span`
  font-size: 13px;
  color: ${s("textTertiary")} !important;
  line-height: 0;
`;

const Wrapper = styled.a`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${s("background")};
  color: ${s("text")} !important;
  box-shadow: 0 0 0 1px ${s("divider")};
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
        background: ${s("backgroundSecondary")};

        ${Children} {
          opacity: 1;
        }
      }
    `}
`;
