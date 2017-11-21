// @flow
import React from 'react';
import styled from 'styled-components';
import {
  signin,
  developers,
  githubUrl,
  blogUrl,
  twitterUrl,
} from '../../utils/routeHelpers';
import { color } from '../../../shared/styles/constants';

function TopNavigation() {
  return (
    <Nav>
      <Brand href="/">Outline</Brand>
      <Menu>
        <MenuItem>
          <a href="/#features">Features</a>
        </MenuItem>
        <MenuItem>
          <a href={blogUrl()}>Blog</a>
        </MenuItem>
        <MenuItem>
          <a href={developers()}>API</a>
        </MenuItem>
        <MenuItem>
          <a href={signin()}>Sign In</a>
        </MenuItem>
      </Menu>
    </Nav>
  );
}

function BottomNavigation() {
  return (
    <BottomNav>
      <Menu>
        <MenuItem>
          <a href={githubUrl()}>GitHub</a>
        </MenuItem>
        <MenuItem>
          <a href={blogUrl()}>Medium</a>
        </MenuItem>
        <MenuItem>
          <a href={twitterUrl()}>Twitter</a>
        </MenuItem>
      </Menu>
    </BottomNav>
  );
}

const Nav = styled.nav`
  display: flex;
  padding: 20px 30px;
  justify-content: space-between;
`;

const BottomNav = styled(Nav)`
  margin-bottom: 30px;
  justify-content: center;
`;

const Menu = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const MenuItem = styled.li`
  display: inline-block;
  margin: 0 0 0 40px;
  font-size: 15px;
  font-weight: 500;

  a {
    color: ${color.slate};
  }

  a:hover {
    color: ${color.slateDark};
    text-decoration: underline;
  }

  &:first-child {
    margin-left: 0;
  }
`;

const Brand = styled.a`
  font-weight: 600;
  font-size: 20px;
  text-decoration: none;
  color: ${color.black};
`;

export { TopNavigation, BottomNavigation };
