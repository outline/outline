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
              <Header>我的账户</Header>
              <SidebarLink to="/settings" icon={<ProfileIcon />}>
                基础资料
              </SidebarLink>
              <SidebarLink to="/settings/notifications" icon={<EmailIcon />}>
                通知
              </SidebarLink>
              <SidebarLink to="/settings/tokens" icon={<CodeIcon />}>
                API Tokens
              </SidebarLink>
            </Section>
            <Section>
              <Header>团队</Header>
              {user.isAdmin && (
                <SidebarLink to="/settings/details" icon={<TeamIcon />}>
                  基本信息
                </SidebarLink>
              )}
              {user.isAdmin && (
                <SidebarLink to="/settings/security" icon={<PadlockIcon />}>
                  安全
                </SidebarLink>
              )}
              <SidebarLink
                to="/settings/people"
                icon={<UserIcon />}
                exact={false}
              >
                成员
              </SidebarLink>
              <SidebarLink to="/settings/shares" icon={<LinkIcon />}>
                共享链接
              </SidebarLink>
              {user.isAdmin && (
                <SidebarLink to="/settings/export" icon={<DocumentIcon />}>
                  导出数据
                </SidebarLink>
              )}
            </Section>
            {user.isAdmin && (
              <Section>
                <Header>集成</Header>
                <SidebarLink
                  to="/settings/integrations/slack"
                  icon={<SlackIcon />}
                >
                  Slack
                </SidebarLink>
                <SidebarLink
                  to="/settings/integrations/zapier"
                  icon={<ZapierIcon />}
                >
                  Zapier
                </SidebarLink>
              </Section>
            )}
          </Scrollable>
        </Flex>
      </Sidebar>
    );
  }
}

export default inject('auth')(SettingsSidebar);
