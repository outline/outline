import * as React from "react";
import styled, { css } from "styled-components";
import { s } from "../../styles";
import { sanitizeUrl } from "../../utils/urls";
import Flex from "../../components/Flex";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

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

export default function Widget(props: Props) {
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

export const Title = styled.strong`
  font-weight: 500;
  font-size: 14px;
  line-height: 28px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  user-select: none;
  color: ${s("text")};
`;

export const Preview = styled(Flex).attrs({
  gap: 8,
  align: "center",
})`
  flex-grow: 1;
  color: ${s("textTertiary")};
`;

export const Subtitle = styled.span`
  font-size: 13px;
  line-height: 28px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  flex-shrink: 0;
  user-select: none;
  color: ${s("textTertiary")} !important;
`;

const Wrapper = styled.a`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${s("background")};
  color: ${s("text")} !important;
  box-shadow: 0 0 0 1px ${s("divider")};
  white-space: nowrap;
  border-radius: ${EditorStyleHelper.blockRadius};
  padding: ${EditorStyleHelper.blockRadius};
  max-width: 840px;
  cursor: var(--pointer);

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
