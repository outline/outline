import * as React from "react";
import { useTranslation } from "react-i18next";
import { DateFilter as TDateFilter } from "@shared/types";
import FilterOptions from "~/components/FilterOptions";

type Props = {
  /** The selected date filter */
  dateFilter?: string | null;
  /** Callback when a date filter is selected */
  onSelect: (key: TDateFilter) => void;
};

const DateFilter = ({ dateFilter, onSelect }: Props) => {
  const { t } = useTranslation();
  const options = React.useMemo(
    () => [
      {
        key: "",
        label: t("All time"),
      },
      {
        key: "day",
        label: t("Past day"),
      },
      {
        key: "week",
        label: t("Past week"),
      },
      {
        key: "month",
        label: t("Past month"),
      },
      {
        key: "year",
        label: t("Past year"),
      },
    ],
    [t]
  );

  return (
    <FilterOptions
      options={options}
      selectedKeys={[dateFilter]}
      onSelect={onSelect}
      defaultLabel={t("Any time")}
    />
  );
};

export default DateFilter;
