import * as React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function EventBoundary({ children, className }: Props) {
  const handleClick = React.useCallback((event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return (
    <span onClick={handleClick} className={className}>
      {children}
    </span>
  );
}
