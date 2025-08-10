import * as React from "react";
import styled from "styled-components";
import type { FetchPageParams } from "~/stores/base/Store";
import Button, { Inner } from "~/components/Button";
import { PaginatedItem } from "./PaginatedList";
import Combobox, { ComboboxOption } from "./primitives/Combobox";

interface TFilterOption extends ComboboxOption {}

type Props = {
  options: TFilterOption[];
  selectedKeys: (string | null | undefined)[];
  defaultLabel?: string;
  className?: string;
  onSelect: (key: string | null | undefined) => void;
  showFilter?: boolean;
  fetchQuery?: (options: FetchPageParams) => Promise<PaginatedItem[]>;
  fetchQueryOptions?: Record<string, string>;
};

const FilterOptions = ({
  options,
  selectedKeys = [],
  defaultLabel = "Filter options",
  className,
  onSelect,
  showFilter,
  fetchQuery,
  fetchQueryOptions,
}: Props) => {
  return (
    <Combobox
      options={options}
      selectedKeys={selectedKeys}
      defaultLabel={defaultLabel}
      className={className}
      onSelect={onSelect}
      showFilter={showFilter}
      fetchQuery={fetchQuery}
      fetchQueryOptions={fetchQueryOptions}
    />
  );
};

export const StyledButton = styled(Button)`
  box-shadow: none;
  text-transform: none;
  border-color: transparent;
  height: auto;

  &:hover {
    background: transparent;
  }

  ${Inner} {
    line-height: 28px;
    min-height: auto;
  }
`;

export default FilterOptions;
