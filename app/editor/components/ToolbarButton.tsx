import styled, { css } from "styled-components";
import { extraArea, s } from "@shared/styles";

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
  border-radius: 4px;
  background: none;
  transition: opacity 100ms ease-in-out;
  padding: 0;
  opacity: 0.8;
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

  ${extraArea(4)}

  ${(props) =>
    props.active &&
    css`
      opacity: 1;
      color: ${s("accentText")};
      background: ${s("accent")};
    `};
`;
