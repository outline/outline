import styled, { useTheme } from "styled-components";

const cleanPercentage = (percentage: number) => {
  const tooLow = !Number.isFinite(+percentage) || percentage < 0;
  const tooHigh = percentage > 100;
  return tooLow ? 0 : tooHigh ? 100 : +percentage;
};

const Circle = ({
  color,
  percentage,
  offset,
}: {
  color: string;
  percentage?: number;
  offset: number;
}) => {
  const radius = offset * 0.7;
  const circumference = 2 * Math.PI * radius;
  let strokePercentage;

  if (percentage) {
    // because the circle is so small, anything greater than 85% appears like 100%
    percentage = percentage > 85 && percentage < 100 ? 85 : percentage;
    strokePercentage = ((100 - percentage) * circumference) / 100;
  }

  return (
    <circle
      r={radius}
      cx={offset}
      cy={offset}
      fill="none"
      stroke={strokePercentage !== circumference ? color : ""}
      strokeWidth={2.5}
      strokeDasharray={circumference}
      strokeDashoffset={percentage ? strokePercentage : 0}
      strokeLinecap="round"
      style={{
        transition: "stroke-dashoffset 0.6s ease 0s",
      }}
    />
  );
};

/**
 * Renders a small circular progress indicator.
 *
 * @param percentage - the progress to display, clamped to the range 0–100.
 * @param size - the width and height of the indicator in pixels.
 * @param label - an accessible name announced by assistive technology.
 * @returns the rendered progress bar element.
 */
const CircularProgressBar = ({
  percentage,
  size = 16,
  label,
}: {
  percentage: number;
  size?: number;
  label?: string;
}) => {
  const theme = useTheme();
  percentage = cleanPercentage(percentage);
  const offset = Math.floor(size / 2);

  return (
    <SVG
      width={size}
      height={size}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <g transform={`rotate(-90 ${offset} ${offset})`}>
        <Circle color={theme.progressBarBackground} offset={offset} />
        {percentage > 0 && (
          <Circle
            color={theme.accent}
            percentage={percentage}
            offset={offset}
          />
        )}
      </g>
    </SVG>
  );
};

const SVG = styled.svg`
  flex-shrink: 0;
`;

export default CircularProgressBar;
