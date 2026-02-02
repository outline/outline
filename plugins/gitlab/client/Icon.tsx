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
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 0L8.485 8.485L0 12L8.485 15.515L12 24L15.515 15.515L24 12L15.515 8.485L12 0ZM12 16.97L9.03 12L12 7.03L14.97 12L12 16.97Z"
      />
    </svg>
  );
}
