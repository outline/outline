type Props = {
  /** The size of the icon, 24px is default to match standard icons */
  size?: number;
  /** The color of the icon, defaults to the current text color */
  color?: string;
};

/**
 * A padlock with an open shackle, the unlocked variant of PadlockIcon.
 *
 * @param props the icon props.
 * @returns the icon element.
 */
export function UnlockedPadlockIcon({
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
        fill={color}
        fillRule="evenodd"
        d="M7,9 L17,9 C18.1045695,9 19,9.8954305 19,11 L19,17 C19,18.1045695 18.1045695,19 17,19 L7,19 C5.8954305,19 5,18.1045695 5,17 L5,11 C5,9.8954305 5.8954305,9 7,9 Z M13,14.7324356 C13.5978014,14.3866262 14,13.7402824 14,13 C14,11.8954305 13.1045695,11 12,11 C10.8954305,11 10,11.8954305 10,13 C10,13.7402824 10.4021986,14.3866262 11,14.7324356 L11,16.5 C11,17.0522847 11.4477153,17.5 12,17.5 C12.5522847,17.5 13,17.0522847 13,16.5 L13,14.7324356 Z"
      />
      <path
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        d="M8,10 L8,9 A4,4 0 0 1 14.83,6.17"
      />
    </svg>
  );
}
