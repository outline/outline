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
        d="M3.93091 12.8481C4.11753 14.6298 4.89358 16.3615 6.25902 17.727C7.62446 19.0923 9.35612 19.8684 11.1378 20.0551L3.93091 12.8481Z"
        fillRule="evenodd"
        clipRule="evenodd"
      />
      <path
        d="M3.89929 11.5437L12.4422 20.0865C13.1671 20.0459 13.8876 19.9084 14.5827 19.6738L4.31194 9.4032C4.07743 10.0982 3.93988 10.8187 3.89929 11.5437Z"
        fillRule="evenodd"
        clipRule="evenodd"
      />
      <path
        d="M4.67981 8.49828L15.4875 19.306C16.0482 19.0374 16.5845 18.7005 17.0837 18.2953L5.6905 6.90222C5.28537 7.40142 4.94847 7.93759 4.67981 8.49828Z"
        fillRule="evenodd"
        clipRule="evenodd"
      />
      <path
        d="M6.29602 6.23494C9.46213 3.10852 14.5632 3.12079 17.7141 6.27173C20.865 9.42266 20.8774 14.5237 17.7509 17.6898L6.29602 6.23494Z"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}
