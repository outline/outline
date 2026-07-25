import type OAuthAuthentication from "~/models/oauth/OAuthAuthentication";
import OAuthAuthenticationRevokeDialog from "~/scenes/Settings/components/OAuthAuthenticationRevokeDialog";
import { dialogActionFactory } from "./common";
import { SettingsSection } from "../sections";

export const revokeOAuthAuthenticationActionFactory = ({
  oauthAuthentication,
}: {
  oauthAuthentication: OAuthAuthentication;
}) =>
  dialogActionFactory({
    analyticsName: "Revoke App",
    section: SettingsSection,
    name: (t) => t("Revoke"),
    title: (t) =>
      t("Revoke {{ appName }}", {
        appName: oauthAuthentication.oauthClient.name,
      }),
    content: (onSubmit) => (
      <OAuthAuthenticationRevokeDialog
        oauthAuthentication={oauthAuthentication}
        onSubmit={onSubmit}
      />
    ),
    dangerous: true,
  });
