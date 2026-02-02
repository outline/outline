import * as React from "react";

type Props = {
  size?: number;
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
      <path d="M11.571 11.513H0a5.218 5.218 0 0 0 10.435 0h1.136zm5.715 0h-1.136a5.218 5.218 0 0 0 10.434 0H24a12.044 12.044 0 0 1-6.714 0zM5.714 0A5.714 5.714 0 0 0 0 5.714a5.714 5.714 0 0 0 11.428 0A5.714 5.714 0 0 0 5.714 0zm12.572 0a5.714 5.714 0 0 0-5.714 5.714 5.714 5.714 0 0 0 11.428 0A5.714 5.714 0 0 0 18.286 0z" />
    </svg>
  );
}
