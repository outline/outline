// @flow
import * as React from "react";

type Props = {
  size?: number,
  fill?: string,
  className?: string,
};

function GitlabLogo({ size = 34, fill = "#FFF", className }: Props) {
  return (
    <svg
      fill={fill}
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 500"
    >
      <g>
        <path d="M249.9,476.8L249.9,476.8l90.7-279.1H159.2L249.9,476.8L249.9,476.8 z" />
        <path d="M32.1,197.7L32.1,197.7L4.5,282.5c-2.5,7.7,0.2,16.2,6.8,21l238.5,173.3L32.1,197.7L32.1,197.7 z" />
        <path d="M32.1,197.7h127.1L104.6,29.6c-2.8-8.6-15-8.6-17.9,0L32.1,197.7L32.1,197.7 z" />
        <path d="M467.6,197.7L467.6,197.7l27.6,84.8c2.5,7.7-0.2,16.2-6.8,21L249.9,476.8L467.6,197.7L467.6,197.7 z" />
        <path d="M467.6,197.7H340.5l54.6-168.1c2.8-8.6,15-8.6,17.9,0L467.6,197.7L467.6,197.7 z" />
      </g>
    </svg>
  );
}

export default GitlabLogo;
