// @flow

import * as React from "react";

type Props = {
  children: React.Node,
  className?: string,
};

export default function EventBoundary({ children, className }: Props) {
  const handleClick = React.useCallback((event: SyntheticEvent<>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return (
    <span onClick={handleClick} className={className}>
      {children}
    </span>
  );
}
