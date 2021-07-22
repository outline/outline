// @flow
import React from "react";
import { useTheme } from "styled-components";

const cleanPercentage = (percentage) => {
  const tooLow = !Number.isFinite(+percentage) || percentage < 0;
  const tooHigh = percentage > 100;
  return tooLow ? 0 : tooHigh ? 100 : +percentage;
};

const Circle = ({
  color,
  percentage,
  offset,
}: {
  color: string,
  percentage?: number,
  offset: number,
}) => {
  const r = offset * 0.7;
  const circ = 2 * Math.PI * r;
  let strokePct;
  if (percentage) {
    // because the circle is so small, anything greater than 85% appears like 100%
    percentage = percentage > 85 && percentage < 100 ? 85 : percentage;
    strokePct = percentage ? ((100 - percentage) * circ) / 100 : 0;
  }

  return (
    <circle
      r={r}
      cx={offset}
      cy={offset}
      fill="none"
      stroke={strokePct !== circ ? color : ""}
      strokeWidth={2.5}
      strokeDasharray={circ}
      strokeDashoffset={percentage ? strokePct : 0}
      strokeLinecap="round"
      style={{ transition: "stroke-dashoffset 0.6s ease 0s" }}
    ></circle>
  );
};

const CircularProgressBar = ({
  percentage,
  size = 16,
}: {
  percentage: number,
  size: number,
}) => {
  const theme = useTheme();
  percentage = cleanPercentage(percentage);
  const offset = Math.floor(size / 2);

  return (
    <svg width={size} height={size}>
      <g transform={`rotate(-90 ${offset} ${offset})`}>
        <Circle color={theme.slate} offset={offset} />
        {percentage > 0 && (
          <Circle
            color={theme.primary}
            percentage={percentage}
            offset={offset}
          />
        )}
      </g>
    </svg>
  );
};

export default CircularProgressBar;
