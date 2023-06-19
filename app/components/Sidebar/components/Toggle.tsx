import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import Arrow from "~/components/Arrow";
import useEventListener from "~/hooks/useEventListener";

type Props = {
  direction: "left" | "right";
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

const Toggle = React.forwardRef<HTMLButtonElement, Props>(
  ({ direction = "left", onClick, style }: Props, ref) => {
    const { t } = useTranslation();
    const [hovering, setHovering] = React.useState(false);
    const positionRef = React.useRef<HTMLDivElement>(null);

    // Not using CSS hover here so that we can disable pointer events on this
    // div and allow click through to the editor elements behind.
    useEventListener("mousemove", (event: MouseEvent) => {
      if (!positionRef.current) {
        return;
      }

      const bound = positionRef.current.getBoundingClientRect();
      const withinBounds =
        event.clientX >= bound.left && event.clientX <= bound.right;
      if (withinBounds !== hovering) {
        setHovering(withinBounds);
      }
    });

    return (
      <Positioner style={style} ref={positionRef} $hovering={hovering}>
        <ToggleButton
          ref={ref}
          $direction={direction}
          onClick={onClick}
          aria-label={t("Toggle sidebar")}
        >
          <Arrow />
        </ToggleButton>
      </Positioner>
    );
  }
);

export const ToggleButton = styled.button<{ $direction?: "left" | "right" }>`
  opacity: 0;
  background: none;
  transition: opacity 100ms ease-in-out;
  transform: translateY(-50%)
    scaleX(${(props) => (props.$direction === "left" ? 1 : -1)});
  position: fixed;
  top: 50vh;
  padding: 8px;
  border: 0;
  pointer-events: none;
  color: ${s("divider")};

  &:active {
    color: ${s("sidebarText")};
  }

  ${breakpoint("tablet")`
    pointer-events: all;
    cursor: var(--pointer);
  `}

  @media (hover: none) {
    opacity: 1;
  }
`;

export const Positioner = styled.div<{ $hovering: boolean }>`
  display: none;
  z-index: 2;
  position: absolute;
  top: 0;
  bottom: 0;
  right: -30px;
  width: 30px;
  pointer-events: none;

  &:focus-within ${ToggleButton} {
    opacity: 1;
  }

  ${(props) =>
    props.$hovering &&
    css`
      ${ToggleButton} {
        opacity: 1;
      }
    `}

  ${breakpoint("tablet")`
    display: block;
  `}
`;

export default Toggle;
