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
        d="M12.0056 17.9792C15.5361 17.9792 18.3981 15.1172 18.3981 11.5867C18.3981 8.05618 15.5361 5.19415 12.0056 5.19415C8.4751 5.19415 5.61307 8.05618 5.61307 11.5867C5.61307 15.1172 8.4751 17.9792 12.0056 17.9792Z"
        fill="none"
        stroke={fill}
        strokeWidth="1.1215"
        strokeMiterlimit="10"
      />
      <path d="M19.4393 9.8338H4.57159C4.42287 9.8338 4.28024 9.89288 4.17508 9.99804C4.06992 10.1032 4.01084 10.2458 4.01084 10.3945V10.9665C4.00449 11.1007 4 11.2323 4 11.3665C4 15.7848 7.58168 19.3665 12 19.3665C16.3514 19.3665 19.8916 15.8921 19.9974 11.5658C19.9974 11.5493 20 11.5329 20 11.516V10.3945C20 10.2458 19.9409 10.1032 19.8358 9.99804C19.7306 9.89288 19.588 9.8338 19.4393 9.8338Z" />
    </svg>
  );
}
