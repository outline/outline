// @flow
import * as React from "react";
import { observer, inject } from "mobx-react";
import type { RouterHistory } from "react-router-dom";
import styled from "styled-components";
import {
  DocumentIcon,
  EmailIcon,
  ProfileIcon,
  PadlockIcon,
  CodeIcon,
  UserIcon,
  GroupIcon,
  LinkIcon,
  TeamIcon,
  BulletedListIcon,
  ExpandedIcon,
} from "outline-icons";
import ZapierIcon from "./icons/Zapier";
import SlackIcon from "./icons/Slack";

import Flex from "components/Flex";
import Sidebar from "./Sidebar";
import Scrollable from "components/Scrollable";
import Section from "./components/Section";
import Header from "./components/Header";
import SidebarLink from "./components/SidebarLink";
import HeaderBlock from "./components/HeaderBlock";
import Version from "./components/Version";
import PoliciesStore from "stores/PoliciesStore";
import AuthStore from "stores/AuthStore";
import env from "env";

type Props = {
  history: RouterHistory,
  policies: PoliciesStore,
  auth: AuthStore,
};

@observer
class SettingsSidebar extends React.Component<Props> {
  returnToDashboard = () => {
    this.props.history.push("/");
  };

  render() {
    const { policies, auth } = this.props;
    const { team } = auth;
    if (!team) return null;

    const can = policies.abilities(team.id);

    return (
      <Sidebar>
        <HeaderBlock
          subheading={
            <ReturnToApp align="center">
              <BackIcon color="currentColor" /> Return to App
            </ReturnToApp>
          }
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
                icon={<ProfileIcon color="currentColor" />}
                label="Profile"
              />
              <SidebarLink
                to="/settings/notifications"
                icon={<EmailIcon color="currentColor" />}
                label="Notifications"
              />
              <SidebarLink
                to="/settings/tokens"
                icon={<CodeIcon color="currentColor" />}
                label="API Tokens"
              />
            </Section>
            <Section>
              <Header>Team</Header>
              {can.update && (
                <SidebarLink
                  to="/settings/details"
                  icon={<TeamIcon color="currentColor" />}
                  label="Details"
                />
              )}
              {can.update && (
                <SidebarLink
                  to="/settings/security"
                  icon={<PadlockIcon color="currentColor" />}
                  label="Security"
                />
              )}
              <SidebarLink
                to="/settings/people"
                icon={<UserIcon color="currentColor" />}
                exact={false}
                label="People"
              />
              <SidebarLink
                to="/settings/groups"
                icon={<GroupIcon color="currentColor" />}
                exact={false}
                label="Groups"
              />
              <SidebarLink
                to="/settings/shares"
                icon={<LinkIcon color="currentColor" />}
                label="Share Links"
              />
              {can.auditLog && (
                <SidebarLink
                  to="/settings/events"
                  icon={<BulletedListIcon color="currentColor" />}
                  label="Audit Log"
                />
              )}
              {can.export && (
                <SidebarLink
                  to="/settings/export"
                  icon={<DocumentIcon color="currentColor" />}
                  label="Export Data"
                />
              )}
            </Section>
            {can.update && (
              <Section>
                <Header>Integrations</Header>
                <SidebarLink
                  to="/settings/integrations/slack"
                  icon={<SlackIcon color="currentColor" />}
                  label="Slack"
                />
                <SidebarLink
                  to="/settings/integrations/zapier"
                  icon={<ZapierIcon color="currentColor" />}
                  label="Zapier"
                />
              </Section>
            )}
            {can.update &&
              env.DEPLOYMENT !== "hosted" && (
                <Section>
                  <Header>Installation</Header>
                  <Version />
                </Section>
              )}
          </Scrollable>
        </Flex>
      </Sidebar>
    );
  }
}

const BackIcon = styled(ExpandedIcon)`
  transform: rotate(90deg);
  margin-left: -8px;
`;

const ReturnToApp = styled(Flex)`
  height: 16px;
`;

export default inject("auth", "policies")(SettingsSidebar);
