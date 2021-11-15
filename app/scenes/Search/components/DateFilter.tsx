import * as React from "react";
import { useTranslation } from "react-i18next";
import FilterOptions from "components/FilterOptions";
type Props = {
  dateFilter: string | null | undefined;
  onSelect: (key: string | null | undefined) => void;
};

const DateFilter = ({ dateFilter, onSelect }: Props) => {
  const { t } = useTranslation();
  const options = React.useMemo(
    () => [
      {
        key: "",
        label: t("Any time"),
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
      activeKey={dateFilter}
      onSelect={onSelect}
      defaultLabel={t("Any time")}
    />
  );
};

export default DateFilter;
