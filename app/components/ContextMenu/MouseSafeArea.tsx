import * as React from "react";
import { useMousePosition } from "~/hooks/useMousePosition";

type Positions = {
  /** Sub-menu x */
  x: number;
  /** Sub-menu y */
  y: number;
  /** Sub-menu height */
  h: number;
  /** Sub-menu width */
  w: number;
  /** Mouse x */
  mouseX: number;
  /** Mouse y */
  mouseY: number;
};

/**
 * Component to cover the area between the mouse cursor and the sub-menu, to
 * allow moving cursor to lower parts of sub-menu without the sub-menu
 * disappearing.
 */
export default function MouseSafeArea(props: {
  parentRef: React.RefObject<HTMLElement | null>;
}) {
  const {
    x = 0,
    y = 0,
    height: h = 0,
    width: w = 0,
  } = props.parentRef.current?.getBoundingClientRect() || {};
  const [mouseX, mouseY] = useMousePosition();
  const positions = { x, y, h, w, mouseX, mouseY };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        // backgroundColor: "rgba(255,0,0,0.1)", // Uncomment to debug
        right: getRight(positions),
        left: getLeft(positions),
        height: h,
        width: getWidth(positions),
        clipPath: getClipPath(positions),
      }}
    />
  );
}

const getLeft = ({ x, mouseX }: Positions) =>
  mouseX > x ? undefined : -Math.max(x - mouseX, 10) + "px";

const getRight = ({ x, w, mouseX }: Positions) =>
  mouseX > x ? -Math.max(mouseX - (x + w), 10) + "px" : undefined;

const getWidth = ({ x, w, mouseX }: Positions) =>
  mouseX > x
    ? Math.max(mouseX - (x + w), 10) + "px"
    : Math.max(x - mouseX, 10) + "px";

const getClipPath = ({ x, y, h, mouseX, mouseY }: Positions) =>
  mouseX > x
    ? `polygon(0% 0%, 0% 100%, 100% ${(100 * (mouseY - y)) / h - 10}%, 100% ${
        (100 * (mouseY - y)) / h + 5
      }%)`
    : `polygon(100% 0%, 0% ${(100 * (mouseY - y)) / h - 10}%, 0% ${
        (100 * (mouseY - y)) / h + 5
      }%, 100% 100%)`;
