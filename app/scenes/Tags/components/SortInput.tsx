import { SortAscendingIcon, SortDescendingIcon } from "outline-icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import FilterOptions from "~/components/FilterOptions";
import type { TagSort } from "~/utils/tags";

type Props = {
  /** The selected sort field */
  sort: TagSort;
  /** The selected sort direction */
  direction: "ASC" | "DESC";
  /** Callback when a sort option is selected */
  onSelect: (sort: TagSort, direction: "ASC" | "DESC") => void;
};

export const SortInput = ({ sort, direction, onSelect }: Props) => {
  const { t } = useTranslation();
  const options = useMemo(
    () => [
      {
        key: "name-ASC",
        label: t("A → Z"),
        icon: <SortAscendingIcon size={20} />,
      },
      {
        key: "name-DESC",
        label: t("Z → A"),
        icon: <SortDescendingIcon size={20} />,
      },
      {
        key: "documentCount-DESC",
        label: t("Most used"),
        icon: <SortDescendingIcon size={20} />,
      },
      {
        key: "documentCount-ASC",
        label: t("Least used"),
        icon: <SortAscendingIcon size={20} />,
      },
    ],
    [t]
  );

  const handleSelect = (key: string) => {
    const [sortField, sortDirection] = key.split("-");
    onSelect(sortField as TagSort, sortDirection as "ASC" | "DESC");
  };

  return (
    <FilterOptions
      showFilter={false}
      showIcons={false}
      disclosure={false}
      options={options}
      selectedKeys={[`${sort}-${direction}`]}
      onSelect={(key) => key && handleSelect(key)}
      defaultLabel={t("A → Z")}
    />
  );
};
