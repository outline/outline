import React, { useState } from "react";

type Props = {
  children: React.ReactNode;
  onDoubleTap?: () => void;
  onDoubleClick?: () => void;
};
const Gestures = ({ children, onDoubleTap, onDoubleClick }: Props) => {
  const [lastTapTime, setLastTapTime] = useState(0);

  const handleTouchStart = (ev: React.TouchEvent<HTMLDivElement>) => {
    ev.preventDefault();
    const currentTime = Date.now();
    const timeSinceLastTap = currentTime - lastTapTime;

    if (timeSinceLastTap < 300) {
      onDoubleTap?.();
    }

    setLastTapTime(currentTime);
  };

  const handleDoubleClick = (ev: React.MouseEvent<HTMLDivElement>) => {
    ev.preventDefault();
    onDoubleClick?.();
  };

  return (
    <div
      className="gesture-detector"
      style={{ touchAction: "manipulation" }}
      onTouchStart={handleTouchStart}
      onDoubleClick={handleDoubleClick}
    >
      {children}
    </div>
  );
};

export { Gestures };
