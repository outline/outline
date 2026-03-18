type Props = {
  /** The size of the icon, 24px is default to match standard icons */
  size?: number;
  /** The color of the underline bar, defaults to currentColor */
  color?: string;
};

/**
 * Icon representing font/text color, showing an "A" with a colored underline bar.
 *
 * @param size - the size of the icon in pixels.
 * @param color - the color of the underline bar.
 */
export default function FontColorIcon({
  size = 24,
  color = "currentColor",
}: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M11.16 3.6L5.04 20h2.4l1.56-4.2h6.12L16.68 20h2.28L12.84 3.6h-1.68zm-1.44 10.8l2.32-6.2 2.32 6.2H9.72z" />
      <rect x="3" y="21.5" width="18" height="2" fill={color} rx="1" />
    </svg>
  );
}
