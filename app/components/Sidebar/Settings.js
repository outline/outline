// @flow
import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import styled from 'styled-components';
import { observer, inject } from 'mobx-react';
import Flex from 'shared/components/Flex';
import { color, layout } from 'shared/styles/constants';

import Scrollable from 'components/Scrollable';
import ProfileIcon from 'components/Icon/ProfileIcon';
import SettingsIcon from 'components/Icon/SettingsIcon';
import CodeIcon from 'components/Icon/CodeIcon';
import UserIcon from 'components/Icon/UserIcon';
import Header from './components/Header';
import SidebarLink from './components/SidebarLink';
import HeaderBlock from './components/HeaderBlock';
import AuthStore from 'stores/AuthStore';

type Props = {
  history: Object,
  location: Location,
  auth: AuthStore,
};

@observer
class Sidebar extends Component {
  props: Props;

  returnToDashboard = () => {
    this.props.history.push('/');
  };

  render() {
    const { team } = this.props.auth;
    if (!team) return;

    return (
      <Container column>
        <HeaderBlock
          subheading="◄ Return to Dashboard"
          teamName={team.name}
          logoUrl={team.avatarUrl}
          onClick={this.returnToDashboard}
        />

        <Flex auto column>
          <Scrollable>
            <Section>
              <Header>Account</Header>
              <SidebarLink to="/settings" icon={<ProfileIcon />}>
                Profile
              </SidebarLink>
              <SidebarLink to="/settings/tokens" icon={<CodeIcon />}>
                API Tokens
              </SidebarLink>
            </Section>
            <Section>
              <Header>Team</Header>
              <SidebarLink to="/settings/members" icon={<UserIcon />}>
                Members
              </SidebarLink>
              <SidebarLink
                to="/settings/integrations/slack"
                icon={<SettingsIcon />}
              >
                Integrations
              </SidebarLink>
            </Section>
          </Scrollable>
        </Flex>
      </Container>
    );
  }
}

const Container = styled(Flex)`
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  width: ${layout.sidebarWidth};
  background: ${color.smoke};
  transition: left 200ms ease-in-out;
`;

const Section = styled(Flex)`
  flex-direction: column;
  margin: 24px 0;
  padding: 0 24px;
  position: relative;
`;

export default withRouter(inject('auth')(Sidebar));
