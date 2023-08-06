import { partition } from "lodash";
import { observer } from "mobx-react";
import { LinkIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import SlackLogo from "~/components/AuthLogo/SlackLogo";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import GoogleIcon from "~/components/Icons/GoogleIcon";
import List from "~/components/List";
import PlaceholderList from "~/components/List/Placeholder";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
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

  const sections = partition(
    [
      {
        isEnabled: authenticationProviders.getByName("google")?.isEnabled,
        isActive: authenticationProviders.getByName("google")?.isActive,
        Component: GoogleAuthSection,
      },
      {
        isEnabled: authenticationProviders.getByName("slack")?.isEnabled,
        isActive: authenticationProviders.getByName("slack")?.isActive,
        Component: SlackAuthSection,
      },
    ],
    "isActive"
  );

  const loading = loadingAuthenticationProviders || loadingIntegrations;
  const isEmpty =
    authenticationProviders.orderedData.length === 0 &&
    integrations.orderedData.length === 0;
  const activeIntegrations = sections[0].filter((section) => section.isEnabled);
  const inactiveIntegrations = sections[1].filter(
    (section) => section.isEnabled
  );

  return (
    <Scene title={t("Linked Accounts")} icon={<LinkIcon />}>
      <Heading>{t("Linked Accounts")}</Heading>
      <Text type="secondary">
        <Trans>
          Manage the third-party services that are connected to your account.
        </Trans>
      </Text>
      {loading && isEmpty ? (
        <PlaceholderList count={5} />
      ) : (
        <>
          {activeIntegrations.length > 0 && (
            <List>
              <Heading as="h2">{t("Connected")}</Heading>
              {activeIntegrations.map((section, index) => (
                <section.Component key={index} />
              ))}
            </List>
          )}
          {inactiveIntegrations.length > 0 && (
            <List>
              <Heading as="h2">{t("Available")}</Heading>
              {inactiveIntegrations.map((section, index) => (
                <section.Component key={index} />
              ))}
            </List>
          )}
        </>
      )}
    </Scene>
  );
}

function GoogleAuthSection() {
  const { t } = useTranslation();
  const { authenticationProviders } = useStores();
  const team = useCurrentTeam();
  const integration = authenticationProviders.getByName("google");
  const isActive = integration?.isActive ?? false;

  const connect = () => {
    //
  };

  const disconnect = () => {
    //
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
          <Button
            kind="secondary"
            onClick={disconnect}
            disabled={!team.guestSignin}
          >
            {t("Disconnect")}
          </Button>
        ) : (
          <Button onClick={connect}>{t("Connect")}</Button>
        )
      }
    />
  );
}

function SlackAuthSection() {
  const { t } = useTranslation();
  const { authenticationProviders } = useStores();
  const team = useCurrentTeam();
  const integration = authenticationProviders.getByName("slack");
  const isActive = integration?.isActive ?? false;

  const connect = () => {
    //
  };

  const disconnect = () => {
    //
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
          <Button
            kind="secondary"
            onClick={disconnect}
            disabled={!team.guestSignin}
          >
            {t("Disconnect")}
          </Button>
        ) : (
          <Button onClick={connect}>{t("Connect")}</Button>
        )
      }
    />
  );
}

export default observer(LinkedAccounts);
