import * as React from "react";

type Props = {
  /** The size of the icon, 24px is default to match standard icons */
  size?: number;
  /** The color of the icon, defaults to the current text color */
  fill?: string;
  /** Whether to render the monochrome version, defaults to true */
  monochrome?: boolean;
};

function GoogleLogo({
  size = 24,
  fill = "currentColor",
  monochrome = true,
}: Props) {
  return (
    <svg
      fill={fill}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15.0562 5.7088V18.1034C15.0562 19.4903 16.014 20.2631 17.0281 20.2631C17.9671 20.2631 19 19.6058 19 18.1034V5.8027C19 4.53132 18.061 3.73694 17.0281 3.73694C15.9952 3.73694 15.0562 4.61301 15.0562 5.7088Z"
        fill={monochrome ? undefined : "#F9AB00"}
      />
      <path
        d="M9.89185 12V18.1034C9.89185 19.4903 10.8496 20.2631 11.8637 20.2631C12.8027 20.2631 13.8356 19.6058 13.8356 18.1034V12.0939C13.8356 10.8225 12.8966 10.0281 11.8637 10.0281C10.8308 10.0281 9.89185 10.9042 9.89185 12Z"
        fill={monochrome ? undefined : "#E37400"}
      />
      <path
        d="M6.69923 20.2631C7.78827 20.2631 8.67111 19.3802 8.67111 18.2912C8.67111 17.2022 7.78827 16.3193 6.69923 16.3193C5.6102 16.3193 4.72736 17.2022 4.72736 18.2912C4.72736 19.3802 5.6102 20.2631 6.69923 20.2631Z"
        fill={monochrome ? undefined : "#E37400"}
      />
    </svg>
  );
}

export default GoogleLogo;
