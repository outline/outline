// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import { ProfileIcon, SettingsIcon, CodeIcon, UserIcon } from 'outline-icons';

import Flex from 'shared/components/Flex';
import Sidebar, { Section } from './Sidebar';
import Scrollable from 'components/Scrollable';
import Header from './components/Header';
import SidebarLink from './components/SidebarLink';
import HeaderBlock from './components/HeaderBlock';
import AuthStore from 'stores/AuthStore';

type Props = {
  history: Object,
  auth: AuthStore,
};

@observer
class SettingsSidebar extends React.Component<Props> {
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
              <SidebarLink to="/settings/users" icon={<UserIcon />}>
                Users
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
