import * as React from "react";

type Props = {
  /** The size of the icon, 24px is default to match standard icons */
  size?: number;
  /** The color of the icon, defaults to the current text color */
  fill?: string;
  className?: string;
};

function MicrosoftLogo({ size = 24, fill = "currentColor", className }: Props) {
  return (
    <svg
      fill={fill}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.4707 4.47059H19.9999C19.9999 6.73751 20.0003 9.00442 19.9994 11.2713C17.4902 11.271 14.9804 11.2713 12.4712 11.2713C12.4703 9.00442 12.4707 6.73751 12.4707 4.47059Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.471 12.2434C14.9804 12.2426 17.4902 12.243 20 12.243V19.5294H12.4706C12.471 17.1006 12.4702 14.6718 12.471 12.2434Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 4.47059H11.5294L11.5288 11.2713H4V4.47059Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 12.2429C6.50974 12.2437 9.01948 12.2426 11.5292 12.2437C11.5296 14.6724 11.5292 17.1007 11.5292 19.5294H4V12.2429Z"
      />
    </svg>
  );
}

export default MicrosoftLogo;
