// @flow
import React from "react";
import { useTheme } from "styled-components";

const cleanPercentage = (percentage) => {
  const tooLow = !Number.isFinite(+percentage) || percentage < 0;
  const tooHigh = percentage > 100;
  return tooLow ? 0 : tooHigh ? 100 : +percentage;
};

const Circle = ({ colour, pct }: { colour: string, pct?: number }) => {
  const r = 6.25;
  const circ = 2 * Math.PI * r;
  const strokePct = pct ? ((100 - pct) * circ) / 100 : 0;

  return (
    <circle
      r={r}
      cx={9}
      cy={9}
      fill="none"
      stroke={strokePct !== circ ? colour : ""}
      strokeWidth={2.5}
      strokeDasharray={circ}
      strokeDashoffset={pct ? strokePct : 0}
      strokeLinecap="round"
      style={{ transition: "stroke-dashoffset 0.6s ease 0s" }}
    ></circle>
  );
};

const Pie = ({ percentage }: { percentage: number }) => {
  const theme = useTheme();
  const pct = cleanPercentage(percentage);
  return (
    <svg width={18} height={18}>
      <g transform={`rotate(-90 9 9)`}>
        <Circle colour={theme.slate} />
        {pct > 0 && <Circle colour={theme.primary} pct={pct} />}
      </g>
    </svg>
  );
};

export default Pie;
