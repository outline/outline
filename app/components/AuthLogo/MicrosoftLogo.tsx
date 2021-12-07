import * as React from "react";

type Props = {
  size?: number;
  fill?: string;
  className?: string;
};

function MicrosoftLogo({ size = 34, fill = "#FFF", className }: Props) {
  return (
    <svg
      fill={fill}
      width={size}
      height={size}
      viewBox="0 0 34 34"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.0002 1H33.9998C33.9998 5.8172 34.0007 10.6344 33.9988 15.4516C28.6666 15.4508 23.3334 15.4516 18.0012 15.4516C17.9993 10.6344 18.0002 5.8172 18.0002 1Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.0009 17.5173C23.3333 17.5155 28.6667 17.5164 34 17.5164V33H18C18.0009 27.8388 17.9991 22.6776 18.0009 17.5173V17.5173Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 1H16L15.9988 15.4516H0V1Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 17.5161C5.3332 17.5179 10.6664 17.5155 15.9996 17.5179C16.0005 22.6789 15.9996 27.839 15.9996 33H0V17.5161Z"
      />
    </svg>
  );
}

export default MicrosoftLogo;
