import { eachDayOfInterval, format, startOfDay, subDays } from "date-fns";
import { observer } from "mobx-react";
import { BackIcon, NextIcon } from "outline-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import styled, { useTheme } from "styled-components";
import { s } from "@shared/styles";
import BarChart, { type BarChartDatum } from "~/components/BarChart";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Text from "~/components/Text";
import useRequest from "~/hooks/useRequest";
import type Document from "~/models/Document";
import { client } from "~/utils/ApiClient";

type InsightDataPoint = {
  date: string;
  viewCount: number;
  commentCount: number;
  reactionCount: number;
  revisionCount: number;
};

type InsightsResponse = {
  data: InsightDataPoint[];
};

/** The number of days shown in a single window. */
const WindowDays = 30;

type Props = {
  document: Document;
};

function InsightsChart({ document }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  // The number of WindowDays-sized windows to move back from today.
  const [offset, setOffset] = useState(0);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const series = useMemo(
    () => [
      { key: "viewCount", label: t("Views"), color: theme.brand.blue },
      { key: "commentCount", label: t("Comments"), color: theme.brand.purple },
      { key: "reactionCount", label: t("Reactions"), color: theme.brand.pink },
      { key: "revisionCount", label: t("Edits"), color: theme.brand.green },
    ],
    [t, theme]
  );

  const { windowStart, windowEnd } = useMemo(() => {
    const end = subDays(startOfDay(new Date()), offset * WindowDays);
    return { windowStart: subDays(end, WindowDays - 1), windowEnd: end };
  }, [offset]);

  const fetchInsights = useCallback(
    () =>
      client.post("/documents.insights", {
        id: document.id,
        startDate: windowStart.toISOString(),
        endDate: windowEnd.toISOString(),
        period: "day",
      }) as Promise<InsightsResponse>,
    [document.id, windowStart, windowEnd]
  );

  const { data, request, loaded } = useRequest(fetchInsights);

  useEffect(() => {
    void request();
  }, [request]);

  // Fill every day in the window so the chart has a continuous x-axis, even
  // for days with no recorded activity.
  const chartData = useMemo<BarChartDatum[]>(() => {
    const byDate = new Map(data?.data.map((point) => [point.date, point]));
    return eachDayOfInterval({ start: windowStart, end: windowEnd }).map(
      (day) => {
        const key = format(day, "yyyy-MM-dd");
        const point = byDate.get(key);
        return {
          label: key,
          viewCount: hidden.viewCount ? 0 : (point?.viewCount ?? 0),
          commentCount: hidden.commentCount ? 0 : (point?.commentCount ?? 0),
          reactionCount: hidden.reactionCount ? 0 : (point?.reactionCount ?? 0),
          revisionCount: hidden.revisionCount ? 0 : (point?.revisionCount ?? 0),
        };
      }
    );
  }, [data, windowStart, windowEnd, hidden]);

  const visibleSeries = useMemo(
    () => series.filter((s) => !hidden[s.key]),
    [series, hidden]
  );

  const handleToggle = (key: string) => () =>
    setHidden((prev) => ({ ...prev, [key]: !prev[key] }));

  const handlePrevious = () => setOffset((prev) => prev + 1);
  const handleNext = () => setOffset((prev) => Math.max(0, prev - 1));

  const rangeLabel = `${format(windowStart, "MMM d")} – ${format(
    windowEnd,
    "MMM d"
  )}`;

  const isEmpty =
    loaded &&
    chartData.every(
      (d) =>
        !d.viewCount && !d.commentCount && !d.reactionCount && !d.revisionCount
    );

  return (
    <Wrapper column>
      <ChartArea>
        <BarChart
          data={chartData}
          series={visibleSeries}
          height={208}
          formatTick={(label) => format(new Date(label), "MMM d")}
          formatTooltipLabel={(label) => format(new Date(label), "MMM d, yyyy")}
        />

        {isEmpty && (
          <Empty type="tertiary" size="small">
            {t("No activity recorded in this period")}
          </Empty>
        )}
      </ChartArea>

      <Controls justify="space-between" align="center" gap={8}>
        <Pills role="group" aria-label={t("Toggle series")}>
          {series.map((item) => (
            <Pill
              key={item.key}
              type="button"
              onClick={handleToggle(item.key)}
              aria-pressed={!hidden[item.key]}
              $active={!hidden[item.key]}
              $color={item.color}
            >
              <Swatch
                style={{
                  background: hidden[item.key]
                    ? theme.textTertiary
                    : item.color,
                }}
              />
              {item.label}
            </Pill>
          ))}
        </Pills>
        <Flex align="center" gap={4} shrink={false}>
          <NudeButton onClick={handlePrevious} aria-label={t("Previous")}>
            <BackIcon size={20} />
          </NudeButton>
          <Range type="secondary" size="small">
            {rangeLabel}
          </Range>
          <NudeButton
            onClick={handleNext}
            disabled={offset === 0}
            aria-label={t("Next")}
          >
            <NextIcon size={20} />
          </NudeButton>
        </Flex>
      </Controls>
    </Wrapper>
  );
}

const Wrapper = styled(Flex)`
  margin-top: 8px;
`;

const ChartArea = styled.div`
  position: relative;
`;

const Controls = styled(Flex)`
  margin-top: 12px;
  flex-wrap: wrap;
`;

const Pills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const Pill = styled.button<{ $active: boolean; $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  padding: 0;
  background: none;
  cursor: var(--pointer);
  font-size: 13px;
  font-weight: 500;
  color: ${(props) => (props.$active ? props.$color : s("textTertiary"))};
  opacity: ${(props) => (props.$active ? 1 : 0.7)};

  &:hover {
    opacity: 1;
  }
`;

const Range = styled(Text)`
  white-space: nowrap;
  margin: 0;
`;

const Empty = styled(Text)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  pointer-events: none;
  text-align: center;
`;

const Swatch = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
`;

export default observer(InsightsChart);
