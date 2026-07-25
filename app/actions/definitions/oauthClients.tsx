import { PlusIcon } from "outline-icons";
import stores from "~/stores";
import type OAuthClient from "~/models/oauth/OAuthClient";
import { OAuthClientNew } from "~/components/OAuthClient/OAuthClientNew";
import OAuthClientDeleteDialog from "~/scenes/Settings/components/OAuthClientDeleteDialog";
import { createInternalLinkAction } from "..";
import { dialogActionFactory } from "./common";
import { SettingsSection } from "../sections";
import { settingsPath } from "~/utils/routeHelpers";

export const createOAuthClient = dialogActionFactory({
  analyticsName: "New App",
  section: SettingsSection,
  name: (t) => t("New App"),
  title: (t) => t("New Application"),
  content: (onSubmit) => <OAuthClientNew onSubmit={onSubmit} />,
  icon: <PlusIcon />,
  keywords: "create",
  stopEvent: true,
  visible: () =>
    stores.policies.abilities(stores.auth.team?.id || "").createOAuthClient,
});

export const editOAuthClientActionFactory = ({
  oauthClient,
  visible,
}: {
  oauthClient: OAuthClient;
  visible?: boolean;
}) =>
  createInternalLinkAction({
    name: ({ t }) => `${t("Edit")}…`,
    analyticsName: "Edit App",
    section: SettingsSection,
    visible,
    to: settingsPath("applications", oauthClient.id),
  });

export const deleteOAuthClientActionFactory = ({
  oauthClient,
}: {
  oauthClient: OAuthClient;
}) =>
  dialogActionFactory({
    analyticsName: "Delete App",
    section: SettingsSection,
    name: (t) => `${t("Delete")}…`,
    title: (t) => t("Delete app"),
    content: (onSubmit) => (
      <OAuthClientDeleteDialog oauthClient={oauthClient} onSubmit={onSubmit} />
    ),
    dangerous: true,
  });
