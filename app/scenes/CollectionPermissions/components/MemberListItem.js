// @flow
import * as React from 'react';
import styled from 'styled-components';
import { MoreIcon } from 'outline-icons';
import Avatar from 'components/Avatar';
import HelpText from 'components/HelpText';
import Flex from 'shared/components/Flex';
import ListItem from 'components/List/Item';
import User from 'models/User';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';
import NudeButton from 'components/NudeButton';

type Props = {
  user: User,
  showRemove: boolean,
  onRemove: () => void,
};

const MemberListItem = ({ user, onRemove, showRemove }: Props) => {
  return (
    <ListItem
      title={user.name}
      image={<Avatar src={user.avatarUrl} size={32} />}
      actions={
        <Flex align="center">
          <Permission as="span">Can edit&nbsp;</Permission>
          {showRemove && (
            <DropdownMenu
              label={
                <NudeButton>
                  <MoreIcon />
                </NudeButton>
              }
            >
              <DropdownMenuItem onClick={onRemove}>Remove</DropdownMenuItem>
            </DropdownMenu>
          )}
        </Flex>
      }
    />
  );
};

const Permission = styled(HelpText)`
  text-transform: uppercase;
  font-size: 11px;
`;

export default MemberListItem;
