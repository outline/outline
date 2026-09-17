interface GmailIconProps {
  size?: number;
  color?: string;
}

/**
 * Renders the Gmail logo as a decorative icon.
 *
 * @param props the icon size and color.
 * @returns the Gmail logo.
 * @see https://github.com/simple-icons/simple-icons/blob/12.4.0/icons/gmail.svg
 */
export function GmailIcon({
  size = 24,
  color = "currentColor",
}: GmailIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-4 -4 32 32"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
    </svg>
  );
}
