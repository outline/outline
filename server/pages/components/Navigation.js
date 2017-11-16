// @flow
import React from 'react';
import styled from 'styled-components';
import { signin, developers, blogUrl } from '../../utils/routeHelpers';
import { color } from '../../../shared/styles/constants';

function Navigation() {
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

  a {
    color: ${color.slate};
  }

  a:hover {
    color: ${color.slateDark};
    text-decoration: underline;
  }
`;

const Brand = styled.a`
  font-weight: 600;
  font-size: 20px;
  text-decoration: none;
  color: ${color.black};
`;

export default Navigation;
