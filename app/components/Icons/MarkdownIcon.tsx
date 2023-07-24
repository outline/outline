import * as React from "react";

type Props = {
  /** The size of the icon, 24px is default to match standard icons */
  size?: number;
  /** The color of the icon, defaults to the current text color */
  color?: string;
};

export default function MarkdownIcon({
  size = 24,
  color = "currentColor",
  ...rest
}: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <path
        d="M19.2692 7H3.86538C3.38745 7 3 7.38476 3 7.85938V16.2812C3 16.7559 3.38745 17.1406 3.86538 17.1406H19.2692C19.7472 17.1406 20.1346 16.7559 20.1346 16.2812V7.85938C20.1346 7.38476 19.7472 7 19.2692 7Z"
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M5.16345 14.9922V9.14844H6.89422L8.62499 11.2969L10.3558 9.14844H12.0865V14.9922H10.3558V11.6406L8.62499 13.7891L6.89422 11.6406V14.9922H5.16345ZM15.9808 14.9922L13.3846 12.1562H15.1154V9.14844H16.8461V12.1562H18.5769L15.9808 14.9922Z"
        fill={color}
      />
    </svg>
  );
}
