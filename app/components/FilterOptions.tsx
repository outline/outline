import * as React from "react";
import { useMenuState, MenuButton } from "reakit/Menu";
import styled from "styled-components";
import Button, { Inner } from "~/components/Button";
import ContextMenu from "~/components/ContextMenu";
import MenuItem from "~/components/ContextMenu/MenuItem";
import Text from "~/components/Text";
import { Outline } from "./Input";
import InputSearch from "./InputSearch";
import PaginatedList, { PaginatedItem } from "./PaginatedList";

type TFilterOption = PaginatedItem & {
  key: string;
  label: string;
  note?: string;
};

type Props = {
  options: TFilterOption[];
  activeKey: string | null | undefined;
  defaultLabel?: string;
  selectedPrefix?: string;
  className?: string;
  onSelect: (key: string | null | undefined) => void;
  searchable?: boolean;
  paginateFetch?: (options: any) => Promise<any[] | undefined>;
};

const FilterOptions = ({
  options,
  activeKey = "",
  defaultLabel = "Filter options",
  selectedPrefix = "",
  className,
  onSelect,
  searchable,
  paginateFetch,
}: Props) => {
  const menu = useMenuState({
    modal: true,
  });
  const selected =
    options.find((option) => option.key === activeKey) || options[0];

  const selectedLabel = selected ? `${selectedPrefix} ${selected.label}` : "";

  const [filteredData, setFilteredData] = React.useState<TFilterOption[]>([]);

  const clearFilter = React.useCallback(() => {
    setFilteredData(options);
  }, [options]);

  // Simple case-insensitive filter to
  // check if text appears in any author's name.
  const handleFilter = React.useCallback(
    (event) => {
      const { value } = event.target;
      if (value) {
        const filteredData = options.filter((option) =>
          option.label.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredData(filteredData);
      } else {
        clearFilter();
      }
    },
    [clearFilter, options]
  );

  React.useEffect(() => {
    setFilteredData(options);
  }, [options]);

  return (
    <Wrapper>
      <MenuButton {...menu} onClick={clearFilter}>
        {(props) => (
          <StyledButton {...props} className={className} neutral disclosure>
            {activeKey ? selectedLabel : defaultLabel}
          </StyledButton>
        )}
      </MenuButton>
      <ContextMenu aria-label={defaultLabel} {...menu}>
        {searchable && <StyledInputSearch onChange={handleFilter} />}
        {searchable && <br />}
        <PaginatedList
          items={filteredData}
          fetch={paginateFetch}
          renderItem={(option: TFilterOption) => (
            <MenuItem
              key={option.key}
              onClick={() => {
                onSelect(option.key);
                menu.hide();
              }}
              selected={option.key === activeKey}
              {...menu}
            >
              {option.note ? (
                <LabelWithNote>
                  {option.label}
                  <Note>{option.note}</Note>
                </LabelWithNote>
              ) : (
                option.label
              )}
            </MenuItem>
          )}
        />
      </ContextMenu>
    </Wrapper>
  );
};

const Note = styled(Text)`
  margin-top: 2px;
  margin-bottom: 0;
  line-height: 1.2em;
  font-size: 14px;
  font-weight: 400;
  color: ${(props) => props.theme.textTertiary};
`;

const LabelWithNote = styled.div`
  font-weight: 500;
  text-align: left;

  &:hover ${Note} {
    color: ${(props) => props.theme.white50};
  }
`;

const StyledButton = styled(Button)`
  box-shadow: none;
  text-transform: none;
  border-color: transparent;
  height: auto;

  &:hover {
    background: transparent;
  }

  ${Inner} {
    line-height: 24px;
    min-height: auto;
  }
`;

const Wrapper = styled.div`
  margin-right: 8px;
`;

// `position: sticky` leaves a bit of space above the search box,
// which shows author names moving past behind it.
const StyledInputSearch = styled(InputSearch)`
  position: absolute;
  border: none;
  top: 0;
  z-index: 1;
  ${Outline} {
    border-top-style: unset;
    border-right-style: unset;
    border-left-style: unset;
    border-radius: unset;
    font-size: 14px;
    input {
      margin-left: 8px;
    }
  }
`;

export default FilterOptions;
