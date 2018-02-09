// @flow
import React, { Component } from 'react';
import { observer, inject } from 'mobx-react';
import Flex from 'shared/components/Flex';

import Sidebar, { Section } from './Sidebar';
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
  auth: AuthStore,
};

@observer
class SettingsSidebar extends Component {
  props: Props;

  returnToDashboard = () => {
    this.props.history.push('/');
  };

  render() {
    const { team } = this.props.auth;
    if (!team) return;

    return (
      <Sidebar>
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
      </Sidebar>
    );
  }
}

export default inject('auth')(SettingsSidebar);
