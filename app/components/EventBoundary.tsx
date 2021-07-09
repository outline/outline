import * as React from "react";

import { SyntheticEvent } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function EventBoundary({ children, className }: Props) {
  const handleClick = React.useCallback((event: SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return (
    <span onClick={handleClick} className={className}>
      {children}
    </span>
  );
}
