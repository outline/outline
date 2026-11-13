import { observer } from "mobx-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import FilterOptions from "~/components/FilterOptions";
import type { SearchFilter, SelectSearchFilter } from "../searchFilters";
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
  onChange: (id: string, values: string[] | undefined) => void;
  /** Callback when the options open or close. */
  onOpenChange?: (id: string, open: boolean) => void;
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
        onClick={() => onChange(filter.id, undefined)}
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
}: Props & { filter: SelectSearchFilter }) {
  const { t } = useTranslation();
  const source = filter.useOptions();
  const { id, multiple } = filter;

  const selected = useMemo(
    () => source.options.filter((option) => values.includes(option.key)),
    [source.options, values]
  );

  const handleSelect = useCallback(
    (key: string | null | undefined) => {
      if (!key) {
        return;
      }
      if (!multiple) {
        onChange(id, [key]);
        return;
      }
      const next = values.includes(key)
        ? values.filter((value) => value !== key)
        : [...values, key];
      onChange(id, next.length ? next : undefined);
    },
    [id, multiple, values, onChange]
  );

  const handleOpenChange = useCallback(
    (open: boolean) => onOpenChange?.(id, open),
    [id, onOpenChange]
  );

  const icon =
    selected.length === 1 && selected[0].icon ? selected[0].icon : filter.icon;

  return (
    <Chip>
      <FilterOptions
        options={source.options}
        selectedKeys={values}
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
              value={selected.map((option) => option.label).join(", ")}
              disclosure={!isSet}
            />
          </ChipButton>
        }
      />
      {isSet && (
        <ChipRemoveButton
          label={t("Remove filter")}
          onClick={() => onChange(id, undefined)}
        />
      )}
    </Chip>
  );
});
