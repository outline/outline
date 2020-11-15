// @flow
import { observer, inject } from "mobx-react";
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
  ExpandedIcon,
} from "outline-icons";
import * as React from "react";
import { withTranslation, type TFunction } from "react-i18next";
import type { RouterHistory } from "react-router-dom";
import styled from "styled-components";
import AuthStore from "stores/AuthStore";
import PoliciesStore from "stores/PoliciesStore";
import Flex from "components/Flex";
import Scrollable from "components/Scrollable";

import Sidebar from "./Sidebar";
import Header from "./components/Header";
import HeaderBlock from "./components/HeaderBlock";
import Section from "./components/Section";
import SidebarLink from "./components/SidebarLink";
import Version from "./components/Version";
import SlackIcon from "./icons/Slack";
import ZapierIcon from "./icons/Zapier";
import env from "env";

const isHosted = env.DEPLOYMENT === "hosted";

type Props = {
  history: RouterHistory,
  policies: PoliciesStore,
  auth: AuthStore,
  t: TFunction,
};

@observer
class SettingsSidebar extends React.Component<Props> {
  returnToDashboard = () => {
    this.props.history.push("/home");
  };

  render() {
    const { policies, t, auth } = this.props;
    const { team } = auth;
    if (!team) return null;

    const can = policies.abilities(team.id);

    return (
      <Sidebar>
        <HeaderBlock
          subheading={
            <ReturnToApp align="center">
              <BackIcon color="currentColor" /> {t("Return to App")}
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
                label={t("Profile")}
              />
              <SidebarLink
                to="/settings/notifications"
                icon={<EmailIcon color="currentColor" />}
                label={t("Notifications")}
              />
              <SidebarLink
                to="/settings/tokens"
                icon={<CodeIcon color="currentColor" />}
                label={t("API Tokens")}
              />
            </Section>
            <Section>
              <Header>Team</Header>
              {can.update && (
                <SidebarLink
                  to="/settings/details"
                  icon={<TeamIcon color="currentColor" />}
                  label={t("Details")}
                />
              )}
              {can.update && (
                <SidebarLink
                  to="/settings/security"
                  icon={<PadlockIcon color="currentColor" />}
                  label={t("Security")}
                />
              )}
              <SidebarLink
                to="/settings/people"
                icon={<UserIcon color="currentColor" />}
                exact={false}
                label={t("People")}
              />
              <SidebarLink
                to="/settings/groups"
                icon={<GroupIcon color="currentColor" />}
                exact={false}
                label={t("Groups")}
              />
              <SidebarLink
                to="/settings/shares"
                icon={<LinkIcon color="currentColor" />}
                label={t("Share Links")}
              />
              {can.export && (
                <SidebarLink
                  to="/settings/export"
                  icon={<DocumentIcon color="currentColor" />}
                  label={t("Export Data")}
                />
              )}
            </Section>
            {can.update && (
              <Section>
                <Header>{t("Integrations")}</Header>
                <SidebarLink
                  to="/settings/integrations/slack"
                  icon={<SlackIcon color="currentColor" />}
                  label="Slack"
                />
                {isHosted && (
                  <SidebarLink
                    to="/settings/integrations/zapier"
                    icon={<ZapierIcon color="currentColor" />}
                    label="Zapier"
                  />
                )}
              </Section>
            )}
            {can.update && !isHosted && (
              <Section>
                <Header>{t("Installation")}</Header>
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

export default withTranslation()<SettingsSidebar>(
  inject("auth", "policies")(SettingsSidebar)
);
