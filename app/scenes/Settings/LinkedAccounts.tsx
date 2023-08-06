import { partition } from "lodash";
import { observer } from "mobx-react";
import { LinkIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { setCookie } from "tiny-cookie";
import SlackLogo from "~/components/AuthLogo/SlackLogo";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import GoogleIcon from "~/components/Icons/GoogleIcon";
import List from "~/components/List";
import PlaceholderList from "~/components/List/Placeholder";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import DisconnectAccountDialog from "./components/DisconnectAccountDialog";
import Integration from "./components/Integration";

function LinkedAccounts() {
  const { t } = useTranslation();
  const { integrations, authenticationProviders } = useStores();

  const { loading: loadingAuthenticationProviders } = useRequest(
    authenticationProviders.fetchPage,
    true
  );
  const { loading: loadingIntegrations } = useRequest(
    integrations.fetchPage,
    true
  );

  const accounts = partition(
    [
      {
        isEnabled: authenticationProviders.getByName("google")?.isEnabled,
        isActive: authenticationProviders.getByName("google")?.isActive,
        Component: GoogleAuthAccount,
      },
      {
        isEnabled: authenticationProviders.getByName("slack")?.isEnabled,
        isActive: authenticationProviders.getByName("slack")?.isActive,
        Component: SlackAuthAccount,
      },
    ],
    "isActive"
  );

  const appName = env.APP_NAME;
  const loading = loadingAuthenticationProviders || loadingIntegrations;
  const isEmpty =
    authenticationProviders.orderedData.length === 0 &&
    integrations.orderedData.length === 0;
  const activeIntegrations = accounts[0].filter((account) => account.isEnabled);
  const inactiveIntegrations = accounts[1].filter(
    (account) => account.isEnabled
  );

  return (
    <Scene title={t("Linked Accounts")} icon={<LinkIcon />}>
      <Heading>{t("Linked Accounts")}</Heading>
      <Text type="secondary">
        <Trans>
          Manage the third-party services that are connected to {{ appName }}.
        </Trans>
      </Text>
      {loading && isEmpty ? (
        <PlaceholderList count={5} />
      ) : (
        <>
          {activeIntegrations.length > 0 && (
            <List>
              <Heading as="h2">{t("Connected")}</Heading>
              {activeIntegrations.map(({ Component }, index) => (
                <Component key={index} />
              ))}
            </List>
          )}
          {inactiveIntegrations.length > 0 && (
            <List>
              <Heading as="h2">{t("Available")}</Heading>
              {inactiveIntegrations.map(({ Component }, index) => (
                <Component key={index} />
              ))}
            </List>
          )}
        </>
      )}
    </Scene>
  );
}

function GoogleAuthAccount() {
  const { t } = useTranslation();
  const location = useLocation();
  const { dialogs, authenticationProviders } = useStores();
  const team = useCurrentTeam();
  const integration = authenticationProviders.getByName("google");
  const isActive = integration?.isActive ?? false;

  const connect = () => {
    setCookie("postLoginRedirectPath", location.pathname);
    window.location.href = "/auth/google";
  };

  const disconnect = () => {
    dialogs.openModal({
      title: t("Disconnect account"),
      isCentered: true,
      content: (
        <DisconnectAccountDialog
          title="Google"
          isAuthentication
          onSubmit={() => {
            void client.post("/userAuthentications.delete", {
              authenticationProviderId: integration?.id,
            });
            dialogs.closeAllModals();
          }}
        />
      ),
    });
  };

  return (
    <Integration
      title="Google"
      subtitle={
        isActive
          ? "Your Google account is connected and can be used for sign-in"
          : "Connect with Google"
      }
      icon={<GoogleIcon />}
      actions={
        isActive ? (
          <Button neutral onClick={disconnect} disabled={!team.guestSignin}>
            {t("Disconnect")}
          </Button>
        ) : (
          <Button onClick={connect}>{t("Connect")}</Button>
        )
      }
    />
  );
}

function SlackAuthAccount() {
  const { t } = useTranslation();
  const { dialogs, authenticationProviders } = useStores();
  const team = useCurrentTeam();
  const integration = authenticationProviders.getByName("slack");
  const isActive = integration?.isActive ?? false;

  const disconnect = () => {
    dialogs.openModal({
      title: t("Disconnect account"),
      isCentered: true,
      content: (
        <DisconnectAccountDialog
          title="Slack"
          isAuthentication
          onSubmit={() => {
            void client.post("/userAuthentications.delete", {
              authenticationProviderId: integration?.id,
            });
            dialogs.closeAllModals();
          }}
        />
      ),
    });
  };

  return (
    <Integration
      title="Slack"
      subtitle={
        isActive
          ? "Your Slack account is connected and can be used for sign-in"
          : "Connect with Slack"
      }
      icon={<SlackLogo size={16} fill="currentColor" />}
      actions={
        isActive ? (
          <Button neutral onClick={disconnect} disabled={!team.guestSignin}>
            {t("Disconnect")}
          </Button>
        ) : (
          <Button as="a" href="/auth/slack">
            {t("Connect")}
          </Button>
        )
      }
    />
  );
}

export default observer(LinkedAccounts);
