import * as React from "react";
import styled from "styled-components";

type Props = {
  isActiveDrop: boolean;
  innerRef: React.Ref<HTMLDivElement>;
  position?: "top";
  /** Inline-start offset of the visible line in pixels, to match a tree depth. */
  indent?: number;
  /** Width of the area that accepts a drop in pixels, defaults to the full row. */
  hitWidth?: number;
  className?: string;
};

function DropCursor({
  isActiveDrop,
  innerRef,
  position,
  indent = 0,
  hitWidth,
  className,
}: Props) {
  const hitStyle = React.useMemo(
    () => (hitWidth === undefined ? undefined : { width: hitWidth }),
    [hitWidth]
  );

  return (
    <Cursor
      isOver={isActiveDrop}
      position={position}
      $indent={indent}
      className={className}
    >
      <HitArea ref={innerRef} style={hitStyle} />
    </Cursor>
  );
}

// transparent hover zone with a thin visible band vertically centered
const Cursor = styled.div<{
  isOver?: boolean;
  position?: "top";
  $indent: number;
}>`
  opacity: ${(props) => (props.isOver ? 1 : 0)};
  transition: opacity 150ms;
  position: absolute;
  z-index: 1;
  pointer-events: none;
  width: 100%;
  height: 14px;
  background: transparent;
  ${(props) => (props.position === "top" ? "top: -7px;" : "bottom: -7px;")}

  ::after {
    background: ${(props) => props.theme.accent};
    position: absolute;
    top: 6px;
    inset-inline: ${(props) => props.$indent}px 0;
    content: "";
    height: 2px;
    border-radius: 2px;
  }
`;

// The drop target. Narrower than the line when several cursors share a band so
// that the pointer's horizontal position picks between them.
const HitArea = styled.div`
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 100%;
  pointer-events: none;

  [data-drag-active] & {
    pointer-events: auto;
  }
`;

export default DropCursor;
