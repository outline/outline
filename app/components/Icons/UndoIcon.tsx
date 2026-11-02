type Props = {
  /** The size of the icon, 24px is default to match standard icons */
  size?: number;
  /** The color of the icon, defaults to the current text color */
  color?: string;
};

/**
 * An arrow that curves back to the left, used for undo.
 *
 * @param props the icon props.
 * @returns the icon element.
 */
export function UndoIcon({
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
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <path d="M9 14L5 10L9 6" />
      <path d="M5 10H14.5C16.9853 10 19 12.0147 19 14.5C19 16.9853 16.9853 19 14.5 19H11" />
    </svg>
  );
}
