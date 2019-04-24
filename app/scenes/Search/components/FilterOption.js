// @flow
import * as React from 'react';
import { CheckmarkIcon } from 'outline-icons';
import styled from 'styled-components';
import HelpText from 'components/HelpText';
import Flex from 'shared/components/Flex';

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
        <Flex align="center" justify="space-between">
          <span>
            {label}
            {note && <HelpText small>{note}</HelpText>}
          </span>
          {active && <Checkmark />}
        </Flex>
      </Anchor>
    </ListItem>
  );
};

const Checkmark = styled(CheckmarkIcon)`
  flex-shrink: 0;
  padding-left: 4px;
  fill: ${props => props.theme.text};
`;

const Anchor = styled('a')`
  display: flex;
  flex-direction: column;
  font-size: 15px;
  padding: 4px 8px;
  color: ${props => props.theme.text};
  min-height: 32px;

  ${HelpText} {
    font-weight: normal;
    user-select: none;
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
