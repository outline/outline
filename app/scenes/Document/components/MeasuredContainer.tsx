import * as React from "react";
import useMeasure from "react-use-measure";

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
  const [measureRef, rect] = useMeasure();

  return (
    <As
      {...rest}
      ref={measureRef}
      style={{
        [`--${name}-width`]: `${rect.width}px`,
        [`--${name}-height`]: `${rect.height}px`,
      }}
    >
      {children}
    </As>
  );
};
