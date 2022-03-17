import * as React from "react";

const useMouseMove = (timeout: number = 5000) => {
  const [isMouseMoving, setIsMouseMoving] = React.useState(false);
  const timeout = React.useRef<ReturnType<typeof setTimeout>>();

  const onMouseMove = () => {
    timeout.current && clearTimeout(timeout.current);
    setIsMouseMoving(true);
    timeout.current = setTimeout(() => setIsMouseMoving(false), 5000);
  };

  React.useEffect(() => {
    document.addEventListener("mousemove", onMouseMove);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return isMouseMoving;
};

export default useMouseMove;
