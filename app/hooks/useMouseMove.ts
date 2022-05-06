import * as React from "react";

/**
 * Hook to check if mouse is moving in the window
 * @param {number} [timeout] - time in ms to wait before marking the mouse as not moving
 * @returns {boolean} true if the mouse is moving, false otherwise
 */
const useMouseMove = (timeout = 5000) => {
  const [isMouseMoving, setIsMouseMoving] = React.useState(false);
  const timeoutId = React.useRef<ReturnType<typeof setTimeout>>();

  const onMouseMove = React.useCallback(() => {
    timeoutId.current && clearTimeout(timeoutId.current);
    setIsMouseMoving(true);
    timeoutId.current = setTimeout(() => setIsMouseMoving(false), timeout);
  }, [timeout]);

  React.useEffect(() => {
    document.addEventListener("mousemove", onMouseMove);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, [onMouseMove]);

  return isMouseMoving;
};

export default useMouseMove;
