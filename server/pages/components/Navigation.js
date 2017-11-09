// @flow
import React from 'react';
import styled from 'styled-components';
import { color } from '../../../shared/styles/constants';

function Navigation() {
  return (
    <Nav>
      <Brand href="/">Outline</Brand>
      <Menu>
        <MenuItem><a href="/auth/slack">Sign In</a></MenuItem>
      </Menu>
    </Nav>
  );
}

const Nav = styled.nav`
  display: flex;
  padding: 20px 30px;
  justify-content: space-between;
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
`;

const Brand = styled.a`
  font-weight: 600;
  font-size: 20px;
  text-decoration: none;
  color: ${color.black};
`;

export default Navigation;
