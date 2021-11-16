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
  BeakerIcon,
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
    // @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
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
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: any[]; topShadow: true; }' is no... Remove this comment to see the full error message
        <Scrollable topShadow>
          <Section>
            <Header>{t("Account")}</Header>
            <SidebarLink
              // @ts-expect-error ts-migrate(2322) FIXME: Type '{ to: string; icon: Element; label: string; ... Remove this comment to see the full error message
              to="/settings"
              icon={<ProfileIcon color="currentColor" />}
              label={t("Profile")}
            />
            <SidebarLink
              // @ts-expect-error ts-migrate(2322) FIXME: Type '{ to: string; icon: Element; label: string; ... Remove this comment to see the full error message
              to="/settings/notifications"
              icon={<EmailIcon color="currentColor" />}
              label={t("Notifications")}
            />
            {can.createApiKey && (
              <SidebarLink
                // @ts-expect-error ts-migrate(2322) FIXME: Type '{ to: string; icon: Element; label: string; ... Remove this comment to see the full error message
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
                // @ts-expect-error ts-migrate(2322) FIXME: Type '{ to: string; icon: Element; label: string; ... Remove this comment to see the full error message
                to="/settings/details"
                icon={<TeamIcon color="currentColor" />}
                label={t("Details")}
              />
            )}
            {can.update && (
              <SidebarLink
                // @ts-expect-error ts-migrate(2322) FIXME: Type '{ to: string; icon: Element; label: string; ... Remove this comment to see the full error message
                to="/settings/security"
                icon={<PadlockIcon color="currentColor" />}
                label={t("Security")}
              />
            )}
            {can.update && env.DEPLOYMENT !== "hosted" && (
              <SidebarLink
                // @ts-expect-error ts-migrate(2322) FIXME: Type '{ to: string; icon: Element; label: string; ... Remove this comment to see the full error message
                to="/settings/features"
                icon={<BeakerIcon color="currentColor" />}
                label={t("Features")}
              />
            )}
            <SidebarLink
              // @ts-expect-error ts-migrate(2322) FIXME: Type '{ to: string; icon: Element; exact: boolean;... Remove this comment to see the full error message
              to="/settings/members"
              icon={<UserIcon color="currentColor" />}
              exact={false}
              label={t("Members")}
            />
            <SidebarLink
              // @ts-expect-error ts-migrate(2322) FIXME: Type '{ to: string; icon: Element; exact: boolean;... Remove this comment to see the full error message
              to="/settings/groups"
              icon={<GroupIcon color="currentColor" />}
              exact={false}
              label={t("Groups")}
            />
            <SidebarLink
              // @ts-expect-error ts-migrate(2322) FIXME: Type '{ to: string; icon: Element; label: string; ... Remove this comment to see the full error message
              to="/settings/shares"
              icon={<LinkIcon color="currentColor" />}
              label={t("Share Links")}
            />
            {can.export && (
              <SidebarLink
                // @ts-expect-error ts-migrate(2322) FIXME: Type '{ to: string; icon: Element; label: string; ... Remove this comment to see the full error message
                to="/settings/import-export"
                icon={<DocumentIcon color="currentColor" />}
                label={`${t("Import")} / ${t("Export")}`}
              />
            )}
          </Section>
          {can.update && (env.SLACK_KEY || isHosted) && (
            <Section>
              <Header>{t("Integrations")}</Header>
              {env.SLACK_KEY && (
                <SidebarLink
                  // @ts-expect-error ts-migrate(2322) FIXME: Type '{ to: string; icon: Element; label: string; ... Remove this comment to see the full error message
                  to="/settings/integrations/slack"
                  icon={<SlackIcon color="currentColor" />}
                  label="Slack"
                />
              )}
              {isHosted && (
                <SidebarLink
                  // @ts-expect-error ts-migrate(2322) FIXME: Type '{ to: string; icon: Element; label: string; ... Remove this comment to see the full error message
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
