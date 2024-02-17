import * as React from "react";
import { useTranslation } from "react-i18next";
import { StatusFilter as TStatusFilter } from "@shared/types";
import FilterOptions from "~/components/FilterOptions";

type Props = {
  statusFilter: TStatusFilter[];
  onSelect: (option: { statusFilter: TStatusFilter[] }) => void;
};

const DocumentTypeFilter = ({ statusFilter, onSelect }: Props) => {
  const { t } = useTranslation();
  const options = React.useMemo(
    () => [
      {
        key: TStatusFilter.Published,
        label: t("Published documents"),
      },
      {
        key: TStatusFilter.Archived,
        label: t("Archived documents"),
      },
      {
        key: TStatusFilter.Draft,
        label: t("Draft documents"),
      },
    ],
    [t]
  );

  const handleSelect = (key: TStatusFilter) => {
    let modifiedStatusFilter;
    if (statusFilter.includes(key)) {
      modifiedStatusFilter = statusFilter.filter((status) => status !== key);
    } else {
      modifiedStatusFilter = [...statusFilter, key];
    }

    onSelect({ statusFilter: modifiedStatusFilter });
  };

  return (
    <FilterOptions
      options={options}
      selectedKeys={statusFilter}
      onSelect={handleSelect}
      defaultLabel={t("Any status")}
    />
  );
};

export default DocumentTypeFilter;
