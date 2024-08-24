import * as React from "react";
import { Helmet } from "react-helmet-async";
import { Trans } from "react-i18next";
import Heading from "~/components/Heading";
import ZapierIcon from "~/components/Icons/ZapierIcon";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import env from "~/env";
import useStores from "~/hooks/useStores";

function Zapier() {
  const { ui } = useStores();
  const { resolvedTheme } = ui;
  const appName = env.APP_NAME;

  return (
    <Scene title="Zapier" icon={<ZapierIcon />}>
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
        theme={resolvedTheme}
        hide="notion,confluence-cloud,confluence,google-docs,slack"
        applimit={6}
        introcopy="hide"
        create-without-template="show"
        use-this-zap="show"
      />
    </Scene>
  );
}

export default Zapier;
