import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { DataView, DataViewSummaries, Property } from "@shared/types";
import { SummaryAggregation } from "@shared/types";
import {
  isCountingAggregation,
  summaryAggregationsForProperty,
} from "@shared/utils/properties";
import { InputSelect } from "~/components/InputSelect";

type Props = {
  /** The properties rendered as columns, in the same order as the table. */
  properties: Property[];
  /** The active view, holding each column's chosen summary. */
  view?: DataView;
  /** The computed summary values, keyed by property id. */
  summaries?: DataViewSummaries;
  /** Whether the user may change which summaries are shown. */
  canEdit: boolean;
  /** Callback when a column's summary is changed; null clears it. */
  onChange: (propertyId: string, summary: SummaryAggregation | null) => void;
};

const NONE = "";

/**
 * The footer beneath a table view showing one aggregate per column.
 *
 * Values describe every row matching the view's filter rather than the rows
 * currently loaded, so they stay meaningful as more pages are fetched.
 */
function DatabaseSummaryBar({
  properties,
  view,
  summaries,
  canEdit,
  onChange,
}: Props) {
  const { t } = useTranslation();

  const labels: Record<SummaryAggregation, string> = {
    [SummaryAggregation.Count]: t("Count"),
    [SummaryAggregation.Filled]: t("Filled"),
    [SummaryAggregation.Empty]: t("Empty"),
    [SummaryAggregation.Unique]: t("Unique"),
    [SummaryAggregation.Sum]: t("Sum"),
    [SummaryAggregation.Avg]: t("Average"),
    [SummaryAggregation.Min]: t("Min"),
    [SummaryAggregation.Max]: t("Max"),
  };

  const summaryFor = (propertyId: string) =>
    view?.columns.find((column) => column.propertyId === propertyId)?.summary;

  if (!canEdit && !view?.columns.some((column) => column.summary)) {
    return null;
  }

  return (
    <Bar>
      {properties.map((property) => {
        const available = summaryAggregationsForProperty(property);
        const selected = summaryFor(property.id);
        const value = summaries?.[property.id];

        return (
          <Cell key={property.id}>
            {canEdit && available.length > 0 ? (
              <InputSelect
                options={[
                  { type: "item" as const, label: t("None"), value: NONE },
                  ...available.map((aggregation) => ({
                    type: "item" as const,
                    label: labels[aggregation],
                    value: aggregation,
                  })),
                ]}
                value={selected ?? NONE}
                onChange={(next) =>
                  onChange(
                    property.id,
                    next === NONE ? null : (next as SummaryAggregation)
                  )
                }
                label={t("Summary")}
                labelHidden
                short
              />
            ) : null}
            {selected && (
              <Value>
                <Label>{labels[selected]}</Label>
                {formatValue(value, selected)}
              </Value>
            )}
          </Cell>
        );
      })}
    </Bar>
  );
}

/**
 * Formats a summary for display — counts are always whole numbers, while
 * numeric reductions are rounded to avoid long floating point tails.
 */
function formatValue(
  value: number | null | undefined,
  aggregation: SummaryAggregation
): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (isCountingAggregation(aggregation)) {
    return String(Math.round(value));
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

const Bar = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  border-top: 1px solid ${s("divider")};
  padding: 8px 0;
`;

const Cell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 120px;
`;

const Value = styled.div`
  font-size: 14px;
  color: ${s("text")};
  padding: 0 4px;
`;

const Label = styled.span`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${s("textTertiary")};
  margin-right: 6px;
`;

export default observer(DatabaseSummaryBar);
