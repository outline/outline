import type { DirectionFilter, SortFilter as TSortFilter } from "@shared/types";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import FilterOptions from "~/components/FilterOptions";

type Props = {
  /** The selected sort field */
  sort?: TSortFilter | null;
  /** The selected sort direction */
  direction?: DirectionFilter | null;
  /** Callback when a sort option is selected */
  onSelect: (sort: string, direction: string) => void;
};

const SortFilter = ({ sort, direction, onSelect }: Props) => {
  const { t } = useTranslation();
  const options = useMemo(
    () => [
      {
        key: "searchRanking-DESC",
        label: t("Relevance"),
      },
      {
        key: "updatedAt-DESC",
        label: t("Recently updated"),
      },
      {
        key: "updatedAt-ASC",
        label: t("Least recently updated"),
      },
      {
        key: "createdAt-DESC",
        label: t("Newest"),
      },
      {
        key: "createdAt-ASC",
        label: t("Oldest"),
      },
      {
        key: "title-ASC",
        label: t("A → Z"),
      },
      {
        key: "title-DESC",
        label: t("Z → A"),
      },
    ],
    [t]
  );

  const selectedKey =
    sort && direction ? `${sort}-${direction}` : "searchRanking-DESC";

  const handleSelect = (key: string) => {
    const [sortField, sortDirection] = key.split("-");
    onSelect(sortField, sortDirection);
  };

  return (
    <FilterOptions
      noSort
      showFilter={false}
      options={options}
      selectedKeys={[selectedKey]}
      onSelect={handleSelect}
      defaultLabel={t("Relevance")}
    />
  );
};

export default SortFilter;
