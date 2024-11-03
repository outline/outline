import * as React from "react";

type Props = {
  children?: React.ReactNode;
  className?: string;
};

const EventBoundary: React.FC<Props> = ({ children, className }: Props) => {
  const handlePointerDown = React.useCallback((event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return (
    <span onPointerDown={handlePointerDown} className={className}>
      {children}
    </span>
  );
};

export default EventBoundary;
