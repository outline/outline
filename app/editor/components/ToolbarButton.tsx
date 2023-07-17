import { transparentize } from "polished";
import styled, { css } from "styled-components";
import { s } from "@shared/styles";

type Props = {
  active?: boolean;
  disabled?: boolean;
  hovering?: boolean;
};

export default styled.button.attrs((props) => ({
  type: props.type || "button",
}))<Props>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0;
  min-width: 24px;
  height: 24px;
  cursor: var(--pointer);
  border: none;
  border-radius: 2px;
  background: none;
  transition: opacity 100ms ease-in-out;
  padding: 0;
  opacity: 0.7;
  outline: none;
  pointer-events: all;
  position: relative;
  transition: background 100ms ease-in-out;
  color: ${s("text")};

  &:hover {
    opacity: 1;
  }

  ${(props) =>
    props.hovering &&
    css`
      opacity: 1;
    `};

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }

  &:before {
    position: absolute;
    content: "";
    top: -6px;
    right: -4px;
    left: -4px;
    bottom: -6px;
  }

  ${(props) =>
    props.active &&
    css`
      opacity: 1;
      background: ${(props) => transparentize(0.9, s("accent")(props))};
    `};
`;
