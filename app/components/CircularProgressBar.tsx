import React from "react";
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
    strokePercentage = percentage
      ? ((100 - percentage) * circumference) / 100
      : 0;
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

const CircularProgressBar = ({
  percentage,
  size = 16,
}: {
  percentage: number;
  size?: number;
}) => {
  const theme = useTheme();
  percentage = cleanPercentage(percentage);
  const offset = Math.floor(size / 2);

  return (
    <SVG width={size} height={size}>
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
