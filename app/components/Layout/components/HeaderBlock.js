// @flow
import React from 'react';
import styled from 'styled-components';
import { color } from 'styles/constants';
import type { User, Team } from 'types';
import Flex from 'components/Flex';

type Props = {
  user: User,
  team: Team,
  children?: React$Element<any>,
};

function HeaderBlock({ user, team, children }: Props) {
  return (
    <Header justify="space-between" align="center">
      <Flex align="flex-start" column>
        <TeamName>{team.name}</TeamName>
        <UserName>{user.name}</UserName>
      </Flex>
      {children}
    </Header>
  );
}

const UserName = styled.div`
  font-size: 13px;
`;

const TeamName = styled.div`
  font-family: 'Atlas Grotesk';
  font-weight: bold;
  color: ${color.text};
  text-decoration: none;
  font-size: 16px;
`;

const Header = styled(Flex)`
  flex-shrink: 0;
  padding: 16px 24px;
  position: relative;
  cursor: pointer;
  width: 100%;

  &:active,
  &:hover {
    background: rgba(0,0,0,.05);
  }

  &::after {
    content: "";
    left: 24px;
    right: 24px;
    background: rgba(0,0,0,.075);
    height: 1px;
    position: absolute;
    bottom: 0;
  }
`;

export default HeaderBlock;
