import styled from "styled-components";

type Props = {
  /** A short label rendered inside the badge, four characters or less */
  label: string;
  /** The size of the icon, 24px is default to match standard icons */
  size?: number;
  /** The color of the icon, defaults to the current text color */
  color?: string;
};

/**
 * A generic file format icon, a badge outline with the format written inside.
 * It shares the badge outline of the Markdown icon so a group of format icons
 * reads as one set.
 *
 * @param props The label to display and optional size and color.
 * @returns an icon representing a file format.
 */
export function FileFormatIcon({
  label,
  size = 24,
  color = "currentColor",
  ...rest
}: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path
        d="M19.2692 7H3.86538C3.38745 7 3 7.38476 3 7.85938V16.2812C3 16.7559 3.38745 17.1406 3.86538 17.1406H19.2692C19.7472 17.1406 20.1346 16.7559 20.1346 16.2812V7.85938C20.1346 7.38476 19.7472 7 19.2692 7Z"
        stroke={color}
        strokeWidth="2"
      />
      <text
        x="11.57"
        y="12.07"
        fill={color}
        fontSize="7"
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="central"
        textLength={label.length > 2 ? 13 : undefined}
        lengthAdjust="spacingAndGlyphs"
      >
        {label}
      </text>
    </Svg>
  );
}

const Svg = styled.svg`
  user-select: none;
`;
