// @flow

import * as React from "react";

type Props = {
  children: React.Node,
};

export default function EventBoundary({ children }: Props) {
  const handleClick = React.useCallback((event: SyntheticEvent<>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return <span onClick={handleClick}>{children}</span>;
}
