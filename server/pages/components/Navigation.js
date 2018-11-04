// @flow
import * as React from 'react';
import styled from 'styled-components';
import breakpoint from 'styled-components-breakpoint';
import Centered from './Centered';
import {
  developers,
  changelog,
  about,
  privacy,
  githubUrl,
  twitterUrl,
  spectrumUrl,
} from '../../../shared/utils/routeHelpers';

function TopNavigation() {
  return (
    <Nav>
      <Brand href={process.env.URL}>Outline</Brand>
      <Menu>
        <MenuItemDesktop>
          <a href="/#features">Features</a>
        </MenuItemDesktop>
        <MenuItemDesktop>
          <a href={about()}>About</a>
        </MenuItemDesktop>
        <MenuItemDesktop>
          <a href={changelog()}>Changelog</a>
        </MenuItemDesktop>
        <MenuItemDesktop>
          <a href={twitterUrl()}>Twitter</a>
        </MenuItemDesktop>
        <MenuItem>
          <a href={developers()}>API</a>
        </MenuItem>
        <MenuItem>
          <a href="/#signin">Sign In</a>
        </MenuItem>
      </Menu>
    </Nav>
  );
}

function BottomNavigation() {
  return (
    <BottomNav>
      <div>
        <a href={githubUrl()}>GitHub</a>
      </div>
      <div>
        <a href={twitterUrl()}>Twitter</a>
      </div>
      <div>
        <a href={spectrumUrl()}>Spectrum</a>
      </div>
      <div>
        <a href={privacy()}>Privacy</a>
      </div>
    </BottomNav>
  );
}

const MenuLinkStyle = props => `
  font-size: 15px;
  font-weight: 500;

  a {
    color: ${props.theme.slate};
  }

  a:hover {
    color: ${props.theme.slateDark};
    text-decoration: underline;
  }
`;

const Menu = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const MenuItem = styled.li`
  display: inline-block;
  margin: 0 0 0 40px;

  &:first-child {
    margin-left: 0;
  }

  ${MenuLinkStyle};
`;

const MenuItemDesktop = styled(MenuItem)`
  display: none;

  ${breakpoint('tablet')`
    display: inline-block;
  `};
`;

const Nav = styled(Centered)`
  display: flex;
  padding: 20px 0;
  align-items: center;
  justify-content: space-between;
`;

const BottomNav = styled.nav`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  margin: 4em 0;

  > div {
    display: flex;
    margin: 0 0 40px 0;
    ${MenuLinkStyle};
  }

  ${breakpoint('tablet')`
    flex-direction: row;
    margin: 0 0 4em;

    > div {
      margin: 0 0 0 40px;

      &:first-child {
        margin: 0;
      }
    }
  `};
`;

const Brand = styled.a`
  font-weight: 600;
  font-size: 20px;
  text-decoration: none;
  color: ${props => props.theme.black};
`;

export { TopNavigation, BottomNavigation };
