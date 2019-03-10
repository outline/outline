// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import {
  DocumentIcon,
  EmailIcon,
  ProfileIcon,
  PadlockIcon,
  CodeIcon,
  UserIcon,
  LinkIcon,
  TeamIcon,
} from 'outline-icons';
import ZapierIcon from './icons/Zapier';
import SlackIcon from './icons/Slack';

import Flex from 'shared/components/Flex';
import Sidebar from './Sidebar';
import Scrollable from 'components/Scrollable';
import Section from './components/Section';
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
    const { team, user } = this.props.auth;
    if (!team || !user) return null;

    return (
      <Sidebar>
        <HeaderBlock
          subheading="◄ Return to App"
          teamName={team.name}
          logoUrl={team.avatarUrl}
          onClick={this.returnToDashboard}
        />

        <Flex auto column>
          <Scrollable shadow>
            <Section>
              <Header>Account</Header>
              <SidebarLink
                to="/settings"
                icon={<ProfileIcon />}
                label="Profile"
              />
              <SidebarLink
                to="/settings/notifications"
                icon={<EmailIcon />}
                label="Notifications"
              />
              <SidebarLink
                to="/settings/tokens"
                icon={<CodeIcon />}
                label="API Tokens"
              />
            </Section>
            <Section>
              <Header>Team</Header>
              {user.isAdmin && (
                <SidebarLink
                  to="/settings/details"
                  icon={<TeamIcon />}
                  label="Details"
                />
              )}
              {user.isAdmin && (
                <SidebarLink
                  to="/settings/security"
                  icon={<PadlockIcon />}
                  label="Security"
                />
              )}
              <SidebarLink
                to="/settings/people"
                icon={<UserIcon />}
                exact={false}
                label="People"
              />
              <SidebarLink
                to="/settings/shares"
                icon={<LinkIcon />}
                label="Share Links"
              />
              {user.isAdmin && (
                <SidebarLink
                  to="/settings/export"
                  icon={<DocumentIcon />}
                  label="Export Data"
                />
              )}
            </Section>
            {user.isAdmin && (
              <Section>
                <Header>Integrations</Header>
                <SidebarLink
                  to="/settings/integrations/slack"
                  icon={<SlackIcon />}
                  label="Slack"
                />
                <SidebarLink
                  to="/settings/integrations/zapier"
                  icon={<ZapierIcon />}
                  label="Zapier"
                />
              </Section>
            )}
          </Scrollable>
        </Flex>
      </Sidebar>
    );
  }
}

export default inject('auth')(SettingsSidebar);
