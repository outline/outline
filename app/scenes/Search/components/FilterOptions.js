// @flow
import { find } from "lodash";
import * as React from "react";
import { useMenuState, MenuButton } from "reakit/Menu";
import styled from "styled-components";
import Button, { Inner } from "components/Button";
import ContextMenu from "components/ContextMenu";
import FilterOption from "./FilterOption";

type TFilterOption = {|
  key: string,
  label: string,
  note?: string,
|};

type Props = {|
  options: TFilterOption[],
  activeKey: ?string,
  defaultLabel?: string,
  selectedPrefix?: string,
  className?: string,
  onSelect: (key: ?string) => void,
|};

const FilterOptions = ({
  options,
  activeKey = "",
  defaultLabel,
  selectedPrefix = "",
  className,
  onSelect,
}: Props) => {
  const menu = useMenuState({ modal: true });
  const selected = find(options, { key: activeKey }) || options[0];
  const selectedLabel = selected ? `${selectedPrefix} ${selected.label}` : "";

  return (
    <SearchFilter>
      <MenuButton {...menu}>
        {(props) => (
          <StyledButton
            {...props}
            className={className}
            neutral
            disclosure
            small
          >
            {activeKey ? selectedLabel : defaultLabel}
          </StyledButton>
        )}
      </MenuButton>
      <ContextMenu aria-label={defaultLabel} {...menu}>
        <List>
          {options.map((option) => (
            <FilterOption
              key={option.key}
              onSelect={() => {
                onSelect(option.key);
                menu.hide();
              }}
              active={option.key === activeKey}
              {...option}
              {...menu}
            />
          ))}
        </List>
      </ContextMenu>
    </SearchFilter>
  );
};

const StyledButton = styled(Button)`
  box-shadow: none;
  text-transform: none;
  border-color: transparent;
  height: 28px;

  &:hover {
    background: transparent;
  }

  ${Inner} {
    line-height: 28px;
  }
`;

const SearchFilter = styled.div`
  margin-right: 8px;
`;

const List = styled("ol")`
  list-style: none;
  margin: 0;
  padding: 0 8px;
`;

export default FilterOptions;
