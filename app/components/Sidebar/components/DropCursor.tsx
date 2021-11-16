import * as React from "react";
import styled, { withTheme } from "styled-components";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'types' or its corresponding ty... Remove this comment to see the full error message
import { Theme } from "types";
import "types";

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
  // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
  return <Cursor isOver={isActiveDrop} ref={innerRef} from={from} />;
}

// transparent hover zone with a thin visible band vertically centered
const Cursor = styled("div")`
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'isOver' does not exist on type 'ThemedSt... Remove this comment to see the full error message
  opacity: ${(props) => (props.isOver ? 1 : 0)};
  transition: opacity 150ms;

  position: absolute;
  z-index: 1;

  width: 100%;
  height: 14px;
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'from' does not exist on type 'ThemedStyl... Remove this comment to see the full error message
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
