import styled from "styled-components";
import { s } from "@shared/styles";

type Props = { active?: boolean; disabled?: boolean };

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
  background: none;
  transition: opacity 100ms ease-in-out;
  padding: 0;
  opacity: 0.7;
  outline: none;
  pointer-events: all;
  position: relative;
  color: ${s("toolbarItem")};

  &:hover {
    opacity: 1;
  }

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }

  &:before {
    position: absolute;
    content: "";
    top: -4px;
    right: -4px;
    left: -4px;
    bottom: -4px;
  }

  ${(props) => props.active && "opacity: 1;"};
`;
