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
        d="M12 20.8L4.6 13.4L6.3 7.8L12 13.4L17.7 7.8L19.4 13.4L12 20.8Z"
        fillRule="evenodd"
        clipRule="evenodd"
      />
      <path
        d="M12 20.8L4.6 13.4L6.3 7.8L12 13.4L12 20.8Z"
        fillRule="evenodd"
        clipRule="evenodd"
        fillOpacity="0.3"
      />
      <path
        d="M4.6 13.4L2.5 7.8L6.3 7.8L4.6 13.4Z"
        fillRule="evenodd"
        clipRule="evenodd"
        fillOpacity="0.5"
      />
      <path
        d="M19.4 13.4L21.5 7.8L17.7 7.8L19.4 13.4Z"
        fillRule="evenodd"
        clipRule="evenodd"
        fillOpacity="0.5"
      />
      <path
        d="M6.3 7.8L8.7 2.2L15.3 2.2L17.7 7.8L6.3 7.8Z"
        fillRule="evenodd"
        clipRule="evenodd"
        fillOpacity="0.7"
      />
    </svg>
  );
}

