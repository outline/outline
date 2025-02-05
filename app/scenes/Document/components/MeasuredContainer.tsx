import * as React from "react";
import { useComponentSize } from "@shared/hooks/useComponentSize";

export const MeasuredContainer = <T extends React.ElementType>({
  as: As,
  name,
  children,
  ...rest
}: {
  as: T;
  name: string;
  children?: React.ReactNode;
} & React.ComponentProps<T>) => {
  const ref = React.useRef<HTMLElement>(null);
  const rect = useComponentSize(ref.current);

  return (
    <As
      {...rest}
      ref={ref}
      style={{
        [`--${name}-width`]: `${rect.width}px`,
        [`--${name}-height`]: `${rect.height}px`,
      }}
    >
      {children}
    </As>
  );
};
