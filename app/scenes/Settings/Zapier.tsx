import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import ZapierIcon from "~/components/ZapierIcon";

function Zapier() {
  const { t } = useTranslation();
  return (
    <Scene title="Zapier" icon={<ZapierIcon color="currentColor" />}>
      <Heading>Zapier</Heading>
      <Text type="secondary">
        <Trans>
          Zapier is a platform that allows Outline to easily integrate with
          thousands of other business tools. Head over to Zapier to setup a
          "Zap" and start programmatically interacting with Outline.'
        </Trans>
      </Text>
      <p>
        <Button
          onClick={() =>
            (window.location.href = "https://zapier.com/apps/outline")
          }
        >
          {t("Open Zapier")} →
        </Button>
      </p>
    </Scene>
  );
}

export default Zapier;
