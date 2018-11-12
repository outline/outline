// @flow
import * as React from 'react';
import { sortBy } from 'lodash';
import styled from 'styled-components';
import breakpoint from 'styled-components-breakpoint';
import Centered from './Centered';
import TeamLogo from '../../../shared/components/TeamLogo';
import { fadeAndScaleIn } from '../../../shared/styles/animations';
import {
  developers,
  changelog,
  about,
  privacy,
  githubUrl,
  twitterUrl,
  spectrumUrl,
} from '../../../shared/utils/routeHelpers';

type Sessions = {
  [subdomain: string]: {
    name: string,
    logoUrl: string,
    expires: string,
    url: string,
  },
};

type Props = {
  sessions: ?Sessions,
  loggedIn: boolean,
};

function TopNavigation({ sessions, loggedIn }: Props) {
  const orderedSessions = sortBy(sessions, 'name');

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
        {loggedIn ? (
          <React.Fragment>
            {process.env.SUBDOMAINS_ENABLED === 'true' ? (
              <MenuItem highlighted>
                <a>Your Teams</a>
                <ol>
                  {orderedSessions.map(session => (
                    <MenuItem key={session.url}>
                      <a href={`${session.url}/dashboard`}>
                        <TeamLogo
                          src={session.logoUrl}
                          width={20}
                          height={20}
                        />
                        {session.name}
                      </a>
                    </MenuItem>
                  ))}
                </ol>
              </MenuItem>
            ) : (
              <MenuItem highlighted>
                <a href="/dashboard">Dashboard</a>
              </MenuItem>
            )}
          </React.Fragment>
        ) : (
          <MenuItem>
            <a href="/#signin">Sign In</a>
          </MenuItem>
        )}
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

const MenuItem = styled.li`
  position: relative;
  display: inline-block;
  margin: 0 0 0 40px;

  &:first-child {
    margin-left: 0;
  }

  ${MenuLinkStyle};

  ${props =>
    props.highlighted &&
    `
  position: relative;
  border: 2px solid ${props.theme.slate};
  border-radius: 4px;
  padding: 6px 8px;
  margin-top: -6px;
  margin-bottom: -6px;

  &:hover {
    border: 2px solid ${props.theme.slateDark};

    > a {
      color: ${props.theme.slateDark};
    }
  }

  > a:hover {
    text-decoration: none;
  }
  `};

  &:hover ol {
    animation: ${fadeAndScaleIn} 200ms ease;
    display: block;
  }
`;

const MenuItemDesktop = styled(MenuItem)`
  display: none;

  ${breakpoint('tablet')`
    display: inline-block;
  `};
`;

const Menu = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;

  ol {
    display: none;
    position: absolute;
    margin: 0;
    padding: 0;
    right: 0;
    top: 34px;

    background: #fff;
    border-radius: 4px;
    min-width: 160px;
    padding: 0 0.5em;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05), 0 4px 8px rgba(0, 0, 0, 0.08),
      0 2px 4px rgba(0, 0, 0, 0.08);

    ${MenuItem} {
      padding: 0.5em 0;
      margin: 0;
    }

    ${MenuItem} a {
      display: flex;
      align-items: center;
    }

    ${TeamLogo} {
      margin-right: 0.5em;
    }
  }
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
