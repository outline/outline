import { AxisBottom, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { scaleBand, scaleLinear, scaleOrdinal } from "@visx/scale";
import { BarStack } from "@visx/shape";
import { useTooltip, useTooltipInPortal, defaultStyles } from "@visx/tooltip";
import { useMemo } from "react";
import { useTheme } from "styled-components";

/** A single series rendered as one segment of each stacked bar. */
export interface BarChartSeries {
  /** The key used to read this series' value from each data point. */
  key: string;
  /** Human readable label for the series. */
  label: string;
  /** The color of the series' bar segments. */
  color: string;
}

/** A single bar on the x-axis, keyed by series. */
export interface BarChartDatum {
  /** The x-axis bucket label, used as a unique identifier. */
  label: string;
  /** The numeric value for each series key. */
  [key: string]: string | number;
}

type Props = {
  /** The data points to render, one per bar along the x-axis. */
  data: BarChartDatum[];
  /** The series to stack within each bar. */
  series: BarChartSeries[];
  /** The height of the chart in pixels. */
  height?: number;
  /** Format a bar's label for display on the x-axis. */
  formatTick?: (label: string, index: number) => string;
  /** Format a bar's label for display in the tooltip header. */
  formatTooltipLabel?: (label: string) => string;
};

type TooltipData = {
  label: string;
};

const margin = { top: 8, right: 0, bottom: 24, left: 32 };

const getLabel = (d: BarChartDatum) => d.label;

function Chart({
  data,
  series,
  width,
  height,
  formatTick,
  formatTooltipLabel,
}: Props & { width: number; height: number }) {
  const theme = useTheme();
  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip<TooltipData>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    detectBounds: true,
    scroll: true,
  });

  const keys = useMemo(() => series.map((s) => s.key), [series]);

  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  const xScale = useMemo(
    () =>
      scaleBand<string>({
        domain: data.map(getLabel),
        range: [0, innerWidth],
        padding: 0.2,
      }),
    [data, innerWidth]
  );

  const yMax = useMemo(
    () =>
      Math.max(
        1,
        ...data.map((d) =>
          keys.reduce((sum, key) => sum + (Number(d[key]) || 0), 0)
        )
      ),
    [data, keys]
  );

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        domain: [0, yMax],
        range: [innerHeight, 0],
        nice: true,
      }),
    [yMax, innerHeight]
  );

  const colorScale = useMemo(
    () =>
      scaleOrdinal<string, string>({
        domain: keys,
        range: series.map((s) => s.color),
      }),
    [keys, series]
  );

  // Show a limited number of x-axis labels to avoid crowding.
  const tickStep = Math.ceil(data.length / 6) || 1;

  if (innerWidth <= 0 || innerHeight <= 0) {
    return null;
  }

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={containerRef}
        width={width}
        height={height}
        style={{ display: "block" }}
      >
        <Group left={margin.left} top={margin.top}>
          <AxisLeft
            scale={yScale}
            numTicks={4}
            hideAxisLine
            hideTicks
            tickLabelProps={() => ({
              fill: theme.textTertiary,
              fontSize: 10,
              textAnchor: "end",
              dx: -4,
              dy: 3,
            })}
          />
          <BarStack<BarChartDatum, string>
            data={data}
            keys={keys}
            x={getLabel}
            xScale={xScale}
            yScale={yScale}
            color={colorScale}
          >
            {(barStacks) =>
              barStacks.map((barStack) =>
                barStack.bars.map((bar) => (
                  <rect
                    key={`bar-stack-${barStack.index}-${bar.index}`}
                    x={bar.x}
                    y={bar.y}
                    height={Math.max(0, bar.height)}
                    width={bar.width}
                    fill={bar.color}
                    rx={2}
                    onMouseMove={() =>
                      showTooltip({
                        tooltipData: { label: bar.bar.data.label },
                        tooltipTop: bar.y + margin.top,
                        tooltipLeft: bar.x + bar.width / 2 + margin.left,
                      })
                    }
                    onMouseLeave={hideTooltip}
                  />
                ))
              )
            }
          </BarStack>
          <AxisBottom
            top={innerHeight}
            scale={xScale}
            hideTicks
            stroke={theme.divider}
            tickFormat={(label, index) =>
              index % tickStep === 0
                ? formatTick
                  ? formatTick(label, index)
                  : label
                : ""
            }
            tickLabelProps={() => ({
              fill: theme.textTertiary,
              fontSize: 10,
              textAnchor: "middle",
              dy: 2,
            })}
          />
        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          style={{
            ...defaultStyles,
            background: theme.tooltipBackground,
            color: theme.tooltipText,
            fontSize: 12,
            lineHeight: 1.5,
            padding: "6px 8px",
          }}
        >
          <strong>
            {formatTooltipLabel
              ? formatTooltipLabel(tooltipData.label)
              : tooltipData.label}
          </strong>
          {series.map((s) => {
            const datum = data.find((d) => d.label === tooltipData.label);
            return (
              <div key={s.key}>
                <span style={{ color: s.color }}>●</span> {s.label}:{" "}
                {Number(datum?.[s.key]) || 0}
              </div>
            );
          })}
        </TooltipInPortal>
      )}
    </div>
  );
}

/**
 * A responsive stacked bar chart built with visx. Renders one bar per data
 * point, with each configured series stacked within the bar.
 *
 * @param props the chart data, series configuration and display options.
 * @returns the rendered chart, sized to fill its parent's width.
 */
export function BarChart({ height = 180, ...rest }: Props) {
  return (
    <ParentSize debounceTime={0} parentSizeStyles={{ width: "100%" }}>
      {({ width }) =>
        width > 0 ? <Chart width={width} height={height} {...rest} /> : null
      }
    </ParentSize>
  );
}

export default BarChart;
