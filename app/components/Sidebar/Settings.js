// @flow
import { observer } from "mobx-react";
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
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import Flex from "components/Flex";
import Scrollable from "components/Scrollable";

import SlackIcon from "components/SlackIcon";
import ZapierIcon from "components/ZapierIcon";
import Sidebar from "./Sidebar";
import Header from "./components/Header";
import Section from "./components/Section";
import SidebarLink from "./components/SidebarLink";
import TeamButton from "./components/TeamButton";
import Version from "./components/Version";
import env from "env";
import useCurrentTeam from "hooks/useCurrentTeam";
import useStores from "hooks/useStores";

const isHosted = env.DEPLOYMENT === "hosted";

function SettingsSidebar() {
  const { t } = useTranslation();
  const history = useHistory();
  const team = useCurrentTeam();
  const { policies } = useStores();
  const can = policies.abilities(team.id);

  const returnToDashboard = React.useCallback(() => {
    history.push("/home");
  }, [history]);

  return (
    <Sidebar>
      <TeamButton
        subheading={
          <ReturnToApp align="center">
            <BackIcon color="currentColor" /> {t("Return to App")}
          </ReturnToApp>
        }
        teamName={team.name}
        logoUrl={team.avatarUrl}
        onClick={returnToDashboard}
      />

      <Flex auto column>
        <Scrollable topShadow>
          <Section>
            <Header>{t("Account")}</Header>
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
            {can.createApiKey && (
              <SidebarLink
                to="/settings/tokens"
                icon={<CodeIcon color="currentColor" />}
                label={t("API Tokens")}
              />
            )}
          </Section>
          <Section>
            <Header>{t("Team")}</Header>
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
                to="/settings/import-export"
                icon={<DocumentIcon color="currentColor" />}
                label={`${t("Import")} / ${t("Export")}`}
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

const BackIcon = styled(ExpandedIcon)`
  transform: rotate(90deg);
  margin-left: -8px;
`;

const ReturnToApp = styled(Flex)`
  height: 16px;
`;

export default observer(SettingsSidebar);
