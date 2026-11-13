import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { DateFilter as TDateFilter } from "@shared/types";
import FilterOptions from "~/components/FilterOptions";
import { useDateOptions } from "../filterOptions";

type Props = {
  /** The selected date filter */
  dateFilter?: string | null;
  /** Callback when a date filter is selected */
  onSelect: (key: TDateFilter) => void;
};

const DateFilter = ({ dateFilter, onSelect }: Props) => {
  const { t } = useTranslation();
  const source = useDateOptions();
  const options = useMemo(
    () => [{ key: "", label: t("All time") }, ...source.options],
    [source.options, t]
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
