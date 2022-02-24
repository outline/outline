import { observer } from "mobx-react";
import {
  NewDocumentIcon,
  EmailIcon,
  ProfileIcon,
  PadlockIcon,
  CodeIcon,
  UserIcon,
  GroupIcon,
  LinkIcon,
  TeamIcon,
  BackIcon,
  BeakerIcon,
  DownloadIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import Flex from "~/components/Flex";
import Scrollable from "~/components/Scrollable";
import SlackIcon from "~/components/SlackIcon";
import ZapierIcon from "~/components/ZapierIcon";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import Sidebar from "./Sidebar";
import Header from "./components/Header";
import Section from "./components/Section";
import SidebarButton from "./components/SidebarButton";
import SidebarLink from "./components/SidebarLink";
import Version from "./components/Version";

const isHosted = env.DEPLOYMENT === "hosted";

function SettingsSidebar() {
  const { t } = useTranslation();
  const history = useHistory();
  const team = useCurrentTeam();
  const { policies } = useStores();
  const can = policies.abilities(team.id);

  const returnToApp = React.useCallback(() => {
    history.push("/home");
  }, [history]);

  return (
    <Sidebar>
      <SidebarButton
        title={t("Return to App")}
        image={<StyledBackIcon color="currentColor" />}
        onClick={returnToApp}
        minHeight={48}
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
            {can.update && (
              <SidebarLink
                to="/settings/features"
                icon={<BeakerIcon color="currentColor" />}
                label={t("Features")}
              />
            )}
            <SidebarLink
              to="/settings/members"
              icon={<UserIcon color="currentColor" />}
              exact={false}
              label={t("Members")}
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
            {can.manage && (
              <SidebarLink
                to="/settings/import"
                icon={<NewDocumentIcon color="currentColor" />}
                label={t("Import")}
              />
            )}
            {can.export && (
              <SidebarLink
                to="/settings/export"
                icon={<DownloadIcon color="currentColor" />}
                label={t("Export")}
              />
            )}
          </Section>
          {can.update && (env.SLACK_KEY || isHosted) && (
            <Section>
              <Header>{t("Integrations")}</Header>
              {env.SLACK_KEY && (
                <SidebarLink
                  to="/settings/integrations/slack"
                  icon={<SlackIcon color="currentColor" />}
                  label="Slack"
                />
              )}
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

const StyledBackIcon = styled(BackIcon)`
  margin-left: 4px;
`;

export default observer(SettingsSidebar);
