// @flow
import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { color, layout } from 'styles/constants';
import type { User, Team } from 'types';
import Flex from 'components/Flex';

type Props = {
  user: User,
  team: Team,
  children?: React$Element<any>,
};

function HeaderBlock({ user, team, children }: Props) {
  return (
    <Header justify="space-between">
      <Flex align="center">
        <LogoLink to="/">{team.name}</LogoLink>
        <p>{user.username}</p>
      </Flex>
      {children}
    </Header>
  );
}

const LogoLink = styled(Link)`
  margin-top: 15px;
  font-family: 'Atlas Grotesk';
  font-weight: bold;
  color: ${color.text};
  text-decoration: none;
  font-size: 16px;
`;

const Header = styled(Flex)`
  flex-shrink: 0;
  padding: ${layout.padding};
  padding-bottom: 10px;
`;

export default HeaderBlock;
