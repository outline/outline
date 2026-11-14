type Props = {
  /** The size of the icon, 24px is default to match standard icons */
  size?: number;
  /** The color of the icon, defaults to the current text color */
  color?: string;
};

/**
 * Three stacked lines of decreasing width, used for filter controls.
 *
 * @param props the icon props.
 * @returns the icon.
 */
export function FilterIcon({ size = 24, color = "currentColor" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <rect x="5" y="7" width="14" height="2" rx="1" />
      <rect x="7.5" y="11" width="9" height="2" rx="1" />
      <rect x="10" y="15" width="4" height="2" rx="1" />
    </svg>
  );
}
