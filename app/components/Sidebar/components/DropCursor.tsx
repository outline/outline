import * as React from "react";
import styled, { withTheme } from "styled-components";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'types' or its corresponding ty... Remove this comment to see the full error message
import { Theme } from "types";

function DropCursor({
  isActiveDrop,
  innerRef,
  theme,
  from,
}: {
  isActiveDrop: boolean;
  innerRef: React.Ref<any>;
  theme: Theme;
  from: string;
}) {
  return <Cursor isOver={isActiveDrop} ref={innerRef} from={from} />;
}

// transparent hover zone with a thin visible band vertically centered
const Cursor = styled.div<{ isOver?: boolean, from: string }>`
  opacity: ${(props) => (props.isOver ? 1 : 0)};
  transition: opacity 150ms;

  position: absolute;
  z-index: 1;

  width: 100%;
  height: 14px;
  ${(props) => (props.from === "collections" ? "top: 25px;" : "bottom: -7px;")}
  background: transparent;

  ::after {
    background: ${(props) => props.theme.slateDark};
    position: absolute;
    top: 6px;
    content: "";
    height: 2px;
    border-radius: 2px;
    width: 100%;
  }
`;

export default withTheme(DropCursor);
