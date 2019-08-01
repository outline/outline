// @flow
import * as React from 'react';
import { find } from 'lodash';
import styled from 'styled-components';
import Scrollable from 'components/Scrollable';
import Button from 'components/Button';
import { DropdownMenu } from 'components/DropdownMenu';
import FilterOption from './FilterOption';

type Props = {
  options: {
    key: ?string,
    label: string,
    note?: string,
  }[],
  activeKey: ?string,
  defaultLabel?: string,
  selectedPrefix?: string,
  onSelect: (key: ?string) => void,
};

const FilterOptions = ({
  options,
  activeKey,
  defaultLabel,
  selectedPrefix = '',
  onSelect,
}: Props) => {
  const selected = find(options, { key: activeKey }) || options[0];
  const selectedLabel = selected ? `${selectedPrefix} ${selected.label}` : '';

  return (
    <DropdownButton label={activeKey ? selectedLabel : defaultLabel}>
      {({ closeMenu }) => (
        <List>
          {options.map(option => (
            <FilterOption
              key={option.key}
              onSelect={() => {
                onSelect(option.key);
                closeMenu();
              }}
              active={option.key === activeKey}
              {...option}
            />
          ))}
        </List>
      )}
    </DropdownButton>
  );
};

const Content = styled('div')`
  padding: 0 8px;
  width: 250px;

  p {
    margin-bottom: 0;
  }
`;

const StyledButton = styled(Button)`
  box-shadow: none;
  text-transform: none;
  border-color: transparent;
  height: 28px;

  &:hover {
    background: transparent;
  }
`;

const SearchFilter = props => {
  return (
    <DropdownMenu
      className={props.className}
      label={
        <StyledButton neutral disclosure small>
          {props.label}
        </StyledButton>
      }
      position="left"
    >
      {({ closePortal }) => (
        <MaxHeightScrollable>
          <Content>{props.children({ closeMenu: closePortal })}</Content>
        </MaxHeightScrollable>
      )}
    </DropdownMenu>
  );
};

const MaxHeightScrollable = styled(Scrollable)`
  max-height: 50vh;
  margin: -8px 0;
  padding: 8px 0;
`;

const DropdownButton = styled(SearchFilter)`
  margin-right: 8px;
`;

const List = styled('ol')`
  list-style: none;
  margin: 0;
  padding: 0;
`;

export default FilterOptions;
