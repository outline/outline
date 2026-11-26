import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import FilterOptions from "~/components/FilterOptions";
import { FilterIcon } from "~/components/Icons/FilterIcon";
import type { SearchFilter } from "../searchFilters";
import { Chip, ChipButton, ChipContent } from "./FilterChip";

interface Props {
  /** The filters that can be added. */
  filters: SearchFilter[];
  /** Callback when a filter is picked. */
  onSelect: (id: string) => void;
}

/**
 * A button that opens a list of the filters that are not shown yet.
 *
 * @param props the button props.
 * @returns the add filter button.
 */
export function AddFilterButton({ filters, onSelect }: Props) {
  const { t } = useTranslation();
  const handleSelect = useCallback(
    (key: string | null | undefined) => {
      if (key) {
        onSelect(key);
      }
    },
    [onSelect]
  );

  const options = useMemo(
    () =>
      filters.map((filter) => ({
        key: filter.id,
        label: filter.label,
        icon: filter.icon,
      })),
    [filters]
  );

  return (
    <Chip>
      <FilterOptions
        options={options}
        selectedKeys={NO_SELECTION}
        onSelect={handleSelect}
        defaultLabel={t("More filters")}
        trigger={
          <ChipButton aria-label={t("More filters")}>
            <ChipContent icon={<FilterIcon />} label={t("More")} disclosure />
          </ChipButton>
        }
      />
    </Chip>
  );
}

const NO_SELECTION: string[] = [];
