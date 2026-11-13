import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import FilterOptions from "~/components/FilterOptions";
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
        selectedKeys={[]}
        onSelect={(key) => key && onSelect(key)}
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

function FilterIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
      <rect x="5" y="7" width="14" height="2" rx="1" />
      <rect x="7.5" y="11" width="9" height="2" rx="1" />
      <rect x="10" y="15" width="4" height="2" rx="1" />
    </svg>
  );
}
