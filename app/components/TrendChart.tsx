import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import Text from "~/components/Text";
import { formatCurrency } from "~/utils/format";

/** One day on the trend. */
export interface TrendPoint {
  date: string;
  revenue: number;
  orders: number;
}

interface Props {
  points: TrendPoint[];
  /** Drawing height in pixels; the width fills its container. */
  height?: number;
}

const Frame = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const Svg = styled.svg`
  display: block;
  width: 100%;
  height: auto;
`;

const Area = styled.path`
  fill: ${s("accent")};
  opacity: 0.12;
`;

const Line = styled.path`
  fill: none;
  stroke: ${s("accent")};
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
`;

const Baseline = styled.line`
  stroke: ${s("divider")};
  stroke-width: 1;
`;

/** A short weekday label, e.g. Mon. */
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "short" });

/**
 * Takings over recent days.
 *
 * Drawn as plain SVG rather than pulling in a charting library for one
 * picture. The vertical scale always starts at zero, so the shape of the line
 * matches the shape of the takings instead of exaggerating small differences.
 *
 * @returns the rendered chart.
 */
export function TrendChart({ points, height = 120 }: Props) {
  const { t } = useTranslation();

  if (points.length === 0) {
    return null;
  }

  const width = 100;
  const peak = Math.max(...points.map((point) => point.revenue));
  const step = points.length > 1 ? width / (points.length - 1) : 0;

  // A flat run of zeroes would divide by nothing; draw it along the bottom.
  const y = (value: number) =>
    peak === 0 ? height : height - (value / peak) * (height - 8) - 4;

  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${index * step},${y(point.revenue)}`
    )
    .join(" ");
  const area = `${path} L${(points.length - 1) * step},${height} L0,${height} Z`;

  const total = points.reduce((sum, point) => sum + point.revenue, 0);
  const busiest = points.reduce((best, point) =>
    point.revenue > best.revenue ? point : best
  );

  return (
    <Frame>
      <Text type="tertiary" size="small" as="p">
        {points.length} {t("days")} · {formatCurrency(total)} · {t("busiest")}{" "}
        {dayLabel(busiest.date)} {formatCurrency(busiest.revenue)}
      </Text>
      <Svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={t("Takings over the last {{count}} days", {
          count: points.length,
        })}
      >
        <Area d={area} />
        <Line d={path} />
        <Baseline x1={0} y1={height} x2={width} y2={height} />
      </Svg>
      <Text type="tertiary" size="xsmall" as="p">
        {dayLabel(points[0].date)} – {dayLabel(points[points.length - 1].date)}
      </Text>
    </Frame>
  );
}
