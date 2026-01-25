import { observer } from "mobx-react";
import * as React from "react";
import { useMousePosition } from "~/hooks/useMousePosition";
import usePrevious from "~/hooks/usePrevious";
import useStores from "~/hooks/useStores";

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
export const MouseSafeArea = observer(function MouseSafeArea_(props: {
  parentRef: React.RefObject<HTMLElement | null>;
}) {
  const {
    x = 0,
    y = 0,
    height: h = 0,
    width: w = 0,
  } = props.parentRef.current?.getBoundingClientRect() || {};
  const { ui } = useStores();
  const [mouseX, mouseY] = useMousePosition();
  const [isVisible, setIsVisible] = React.useState(true);
  const positions = { x, y, h, w, mouseX, mouseY };
  const distance = Math.abs(mouseX - x);
  const prevDistance = usePrevious(distance) ?? distance;

  // Hide the safe area if the mouse is moving _away_ from the menu
  React.useEffect(() => {
    if (distance > prevDistance) {
      setIsVisible(false);
    } else if (distance < prevDistance) {
      setIsVisible(true);
    }
  }, [distance, prevDistance]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        backgroundColor: ui.debugSafeArea ? "rgba(255,0,0,0.2)" : undefined,
        right: getRight(positions),
        left: getLeft(positions),
        height: h,
        width: getWidth(positions),
        clipPath: getClipPath(positions),
      }}
    />
  );
});

const buffer = 10;

const getLeft = ({ x, mouseX }: Positions) =>
  mouseX > x ? undefined : -Math.max(x - mouseX + buffer, buffer) + "px";

const getRight = ({ x, w, mouseX }: Positions) =>
  mouseX > x ? -Math.max(mouseX - (x + w) + buffer, buffer) + "px" : undefined;

const getWidth = ({ x, w, mouseX }: Positions) =>
  mouseX > x
    ? Math.max(mouseX - (x + w - buffer), buffer) + "px"
    : Math.max(x - mouseX + buffer, buffer) + "px";

const getClipPath = ({ x, y, h, mouseX, mouseY }: Positions) =>
  mouseX > x
    ? `polygon(0% 0%, 0% 100%, 100% ${
        (100 * (mouseY - y)) / h + 5
      }%, 100% ${(100 * (mouseY - y)) / h - buffer}%)`
    : `polygon(100% 0%, 0% ${(100 * (mouseY - y)) / h - buffer}%, 0% ${
        (100 * (mouseY - y)) / h + 5
      }%, 100% 100%)`;
