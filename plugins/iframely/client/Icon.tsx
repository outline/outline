import * as React from "react";

type Props = {
  /** The size of the icon, 24px is default to match standard icons */
  size?: number;
  /** The color of the icon, defaults to the current text color */
  fill?: string;
};

export default function Icon({ size = 24, fill = "currentColor" }: Props) {
  return (
    <svg
      fill={fill}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      version="1.1"
    >
      <path d="m2.58 12.1 8.66-7V0L0 10zm1.64 1.36 7 5.87v-5.09L7.16 11zm18-7.38L15.32 0v5.15l4.15 3.3zm1.57 1.29-8.51 6.94v5l11.2-9.65z" />
    </svg>
  );
}
