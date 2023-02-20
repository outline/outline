import * as React from "react";

type Props = {
  /** The size of the icon, 24px is default to match standard icons */
  size?: number;
  /** The color of the icon, defaults to the current text color */
  fill?: string;
  className?: string;
};

function GoogleLogo({ size = 24, fill = "currentColor", className }: Props) {
  return (
    <svg
      fill={fill}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M19.2312 10.5455H11.8276V13.6364H16.0892C15.6919 15.6 14.0306 16.7273 11.8276 16.7273C9.22733 16.7273 7.13267 14.6182 7.13267 12C7.13267 9.38182 9.22733 7.27273 11.8276 7.27273C12.9472 7.27273 13.9584 7.67273 14.7529 8.32727L17.0643 6C15.6558 4.76364 13.85 4 11.8276 4C7.42159 4 3.88232 7.56364 3.88232 12C3.88232 16.4364 7.42159 20 11.8276 20C15.8002 20 19.4117 17.0909 19.4117 12C19.4117 11.5273 19.3395 11.0182 19.2312 10.5455Z" />
    </svg>
  );
}

export default GoogleLogo;
