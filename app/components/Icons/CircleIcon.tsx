import * as React from "react";

type Props = {
  /** The size of the icon, 24px is default to match standard icons */
  size?: number;
  /** The color of the icon, defaults to the current text color */
  color?: string;
  /** If true, the icon will retain its color in selected menus and other places that attempt to override it */
  retainColor?: boolean;
};

export default function CircleIcon({
  size = 24,
  color = "currentColor",
  retainColor,
  ...rest
}: Props) {
  return (
    <svg
      fill={color}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      version="1.1"
      style={retainColor ? { fill: color } : undefined}
      {...rest}
    >
      <circle xmlns="http://www.w3.org/2000/svg" cx="12" cy="12" r="8" />
    </svg>
  );
}
