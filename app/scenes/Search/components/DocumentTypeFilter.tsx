import * as React from "react";
import { useTranslation } from "react-i18next";
import { StatusFilter as TStatusFilter } from "@shared/types";
import FilterOptions from "~/components/FilterOptions";

type Props = {
  /** The selected status filters */
  statusFilter: TStatusFilter[];
  /** Callback when a status filter is selected */
  onSelect: (option: { statusFilter: TStatusFilter[] }) => void;
};

const DocumentTypeFilter = ({ statusFilter, onSelect }: Props) => {
  const { t } = useTranslation();
  const options = React.useMemo(
    () => [
      {
        key: TStatusFilter.Published,
        label: t("Published"),
      },
      {
        key: TStatusFilter.Archived,
        label: t("Archived"),
      },
      {
        key: TStatusFilter.Draft,
        label: t("Drafts"),
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
