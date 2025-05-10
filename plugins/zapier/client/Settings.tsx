import * as React from "react";
import { Helmet } from "react-helmet-async";
import { Trans } from "react-i18next";
import { IntegrationScene } from "~/scenes/Settings/components/IntegrationScene";
import Heading from "~/components/Heading";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import ZapierIcon from "./Icon";

function Zapier() {
  const { ui } = useStores();
  const user = useCurrentUser();
  const { resolvedTheme } = ui;
  const appName = env.APP_NAME;

  return (
    <IntegrationScene title="Zapier" icon={<ZapierIcon />}>
      <Heading>Zapier</Heading>
      <Helmet>
        <script
          type="module"
          src="https://cdn.zapier.com/packages/partner-sdk/v0/zapier-elements/zapier-elements.esm.js"
          key="zapier-js"
        />
        <link
          rel="stylesheet"
          href="https://cdn.zapier.com/packages/partner-sdk/v0/zapier-elements/zapier-elements.css"
          key="zapier-styles"
        />
      </Helmet>
      <Text as="p" type="secondary">
        <Trans>
          Zapier is a platform that allows {{ appName }} to easily integrate
          with thousands of other business tools. Automate your workflows, sync
          data, and more.
        </Trans>
      </Text>
      <br />
      <zapier-app-directory
        app="outline"
        link-target="new-tab"
        sign-up-email={user.email}
        theme={resolvedTheme === "system" ? undefined : resolvedTheme}
        hide="notion,confluence-cloud,confluence,google-docs,slack"
        applimit={6}
        introcopy="hide"
        create-without-template="show"
        use-this-zap="show"
      />
    </IntegrationScene>
  );
}

export default Zapier;
