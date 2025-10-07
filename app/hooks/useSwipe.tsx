import { isNumber } from "lodash";
import { useRef } from "react";

type Props = {
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
};

export default function useSwipe({
  onSwipeRight,
  onSwipeLeft,
  onSwipeUp,
  onSwipeDown,
}: Props) {
  const touchXStart = useRef<number>();
  const touchXEnd = useRef<number>();
  const touchYStart = useRef<number>();
  const touchYEnd = useRef<number>();

  const resetTouchPoints = () => {
    touchXStart.current = undefined;
    touchXEnd.current = undefined;
    touchYStart.current = undefined;
    touchYEnd.current = undefined;
  };

  const onTouchStartCapture = (e: React.TouchEvent<HTMLImageElement>) => {
    if (e.touches.length === 1) {
      // Stop propagation only for single touch gestures, otherwise it prevents
      // multi-touch gestures like pinch to zoom to take effect
      e.stopPropagation();
      touchXStart.current = e.changedTouches[0].screenX;
      touchYStart.current = e.changedTouches[0].screenY;
    }
  };

  const onTouchMoveCapture = (e: React.TouchEvent<HTMLImageElement>) => {
    if (
      isNumber(touchXStart.current) &&
      isNumber(touchYStart.current) &&
      e.touches.length === 1
    ) {
      touchXEnd.current = e.changedTouches[0].screenX;
      touchYEnd.current = e.changedTouches[0].screenY;
      const dx = touchXEnd.current - touchXStart.current;
      const dy = touchYEnd.current - touchYStart.current;

      const swipeRight = dx > 0 && Math.abs(dy) < Math.abs(dx);
      if (swipeRight) {
        resetTouchPoints();
        return onSwipeRight();
      }

      const swipeLeft = dx < 0 && Math.abs(dy) < Math.abs(dx);
      if (swipeLeft) {
        resetTouchPoints();
        return onSwipeLeft();
      }

      const swipeDown = dy > 0 && Math.abs(dy) > Math.abs(dx);
      if (swipeDown) {
        resetTouchPoints();
        return onSwipeDown();
      }

      const swipeUp = dy < 0 && Math.abs(dy) > Math.abs(dx);
      if (swipeUp) {
        resetTouchPoints();
        return onSwipeUp();
      }
    }
  };

  const onTouchCancelCapture = () => {
    resetTouchPoints();
  };

  return {
    onTouchStartCapture,
    onTouchMoveCapture,
    onTouchCancelCapture,
  };
}
