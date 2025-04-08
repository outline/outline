import * as React from "react";
import styled, { css, DefaultTheme, ThemeProps } from "styled-components";
import { s } from "@shared/styles"; // Use path alias
import { sanitizeUrl } from "@shared/utils/urls"; // Use path alias

type Props = {
  /** Icon to display on the left side of the widget */
  icon: React.ReactNode;
  /** Title of the widget */
  title: React.ReactNode;
  /** Context, displayed to right of title */
  context?: React.ReactNode;
  /** URL to open when the widget is clicked (optional) */
  href?: string;
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
  const Component = props.href ? WrapperLink : WrapperDiv;

  return (
    <Component 
      className={className}
      // Conditionally add props relevant to links
      target={props.href ? "_blank" : undefined}
      href={props.href ? sanitizeUrl(props.href) : undefined}
      rel={props.href ? "noreferrer nofollow" : undefined}
      onDoubleClick={props.onDoubleClick}
      onMouseDown={props.onMouseDown}
      // onClick might be needed for both div and link for selection handling? Keep it for now.
      onClick={props.onClick}
    >
      {props.icon}
      <Preview>
        <Title>{props.title}</Title>
        <Subtitle>{props.context}</Subtitle>
        <Children>{props.children}</Children>
      </Preview>
    </Component> // Correct closing tag
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

// Base styles for both div and link versions
const wrapperStyles = css`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${s("background")};
  color: ${s("text")} !important; /* Use important carefully */
  box-shadow: 0 0 0 1px ${s("divider")};
  white-space: nowrap;
  border-radius: 8px;
  padding: 6px 8px;
  max-width: 840px;
  cursor: default;

  user-select: none;
  text-overflow: ellipsis;
  overflow: hidden;
`;

// Component rendered as a div (when no href)
const WrapperDiv = styled.div`
  ${wrapperStyles}
`;

// Component rendered as a link (when href is present)
const WrapperLink = styled.a`
  ${wrapperStyles}

  &:hover,
  &:active {
    cursor: pointer !important; /* Use important carefully */
    text-decoration: none !important; /* Use important carefully */
    background: ${s("backgroundSecondary")};

    ${Children} {
      opacity: 1;
    }
  }
`;
