import { observer } from "mobx-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import FilterOptions from "~/components/FilterOptions";
import type { SearchFilter, SelectSearchFilter } from "../searchFilters";
import { CUSTOM_RANGE } from "../searchFilters";
import {
  Chip,
  ChipButton,
  ChipContent,
  ChipRemoveButton,
  ChipStatic,
} from "./FilterChip";

interface Props {
  /** The filter to show. */
  filter: SearchFilter;
  /** The selected values, including defaults. */
  values: string[];
  /** Whether the URL sets the filter, as opposed to using its defaults. */
  isSet: boolean;
  /** Whether the options are open when the chip mounts. */
  defaultOpen?: boolean;
  /** Callback when the selected values change, undefined removes the filter. */
  onChange: (filter: SearchFilter, values: string[] | undefined) => void;
  /** Callback when the options open or close. */
  onOpenChange?: (filter: SearchFilter, open: boolean) => void;
  /** Label of a custom date range, shown in place of an option label. */
  rangeLabel?: string;
  /** Callback when the user asks to choose a custom date range. */
  onCustomRange?: (filter: SearchFilter) => void;
}

/**
 * A chip that shows the value of one search filter and lets the user change
 * or remove it.
 *
 * @param props the chip props.
 * @returns the filter chip.
 */
export function SearchFilterChip(props: Props) {
  const { t } = useTranslation();
  const { filter, onChange } = props;

  if (filter.type === "select") {
    return <SelectFilterChip {...props} filter={filter} />;
  }

  return (
    <Chip>
      <ChipStatic>
        <ChipContent icon={filter.icon} label={filter.label} />
      </ChipStatic>
      <ChipRemoveButton
        label={t("Remove filter")}
        onClick={() => onChange(filter, undefined)}
      />
    </Chip>
  );
}

const SelectFilterChip = observer(function SelectFilterChip_({
  filter,
  values,
  isSet,
  defaultOpen,
  onChange,
  onOpenChange,
  rangeLabel,
  onCustomRange,
}: Props & { filter: SelectSearchFilter }) {
  const { t } = useTranslation();
  const source = filter.useOptions();
  const { multiple } = filter;
  const allowsRange = filter.selection === "date" && !!onCustomRange;

  const options = useMemo(
    () =>
      allowsRange
        ? [...source.options, { key: CUSTOM_RANGE, label: `${t("Custom")}…` }]
        : source.options,
    [allowsRange, source.options, t]
  );

  const selected = useMemo(
    () => source.options.filter((option) => values.includes(option.key)),
    [source.options, values]
  );

  const handleSelect = useCallback(
    (key: string | null | undefined) => {
      if (!key) {
        return;
      }
      if (key === CUSTOM_RANGE) {
        onCustomRange?.(filter);
        return;
      }
      if (!multiple) {
        onChange(filter, [key]);
        return;
      }
      const next = values.includes(key)
        ? values.filter((value) => value !== key)
        : [...values, key];
      onChange(filter, next.length ? next : undefined);
    },
    [filter, multiple, values, onChange, onCustomRange]
  );

  const handleOpenChange = useCallback(
    (open: boolean) => onOpenChange?.(filter, open),
    [filter, onOpenChange]
  );

  // Default values are implied, so only show values that the user picked.
  const shown = isSet ? selected : [];
  const icon =
    shown.length === 1 && shown[0].icon ? shown[0].icon : filter.icon;

  return (
    <Chip>
      <FilterOptions
        options={options}
        selectedKeys={rangeLabel ? [CUSTOM_RANGE] : values}
        onSelect={handleSelect}
        fetchQuery={source.fetchQuery}
        fetchQueryOptions={source.fetchQueryOptions}
        showFilter={source.showFilter}
        defaultLabel={filter.label}
        defaultOpen={defaultOpen}
        onOpenChange={handleOpenChange}
        trigger={
          <ChipButton>
            <ChipContent
              icon={icon}
              label={filter.label}
              value={
                rangeLabel ?? shown.map((option) => option.label).join(", ")
              }
              disclosure={!isSet}
            />
          </ChipButton>
        }
      />
      {isSet && (
        <ChipRemoveButton
          label={t("Remove filter")}
          onClick={() => onChange(filter, undefined)}
        />
      )}
    </Chip>
  );
});
