// @flow
import * as React from 'react';
import styled from 'styled-components';
import HelpText from 'components/HelpText';

type Props = {
  label: string,
  note?: string,
  onSelect: () => void,
  active: boolean,
};

const FilterOption = ({ label, note, onSelect, active }: Props) => {
  return (
    <ListItem active={active}>
      <Anchor onClick={active ? undefined : onSelect}>
        {label}
        {note && <HelpText small>{note}</HelpText>}
      </Anchor>
    </ListItem>
  );
};

const Anchor = styled('a')`
  display: flex;
  flex-direction: column;
  font-size: 15px;
  padding: 4px 32px 4px 8px;
  color: ${props => props.theme.text};

  ${HelpText} {
    font-weight: normal;
  }

  &:hover {
    background: ${props => props.theme.listItemHoverBackground};
  }
`;

const ListItem = styled('li')`
  list-style: none;
  font-weight: ${props => (props.active ? '600' : 'normal')};
`;

export default FilterOption;
