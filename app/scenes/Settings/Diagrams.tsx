import { find } from "lodash";
import { observer } from "mobx-react";
import { LinkIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";

function Diagrams() {
  const user = useCurrentUser();
  const { integrations } = useStores();
  const { t } = useTranslation();

  React.useEffect(() => {
    integrations.fetchPage({
      limit: 100,
    });
  }, [integrations]);

  const integration = find(
    integrations.orderedData,
    (i) => i.service === "diagrams"
  );

  return (
    <Scene title={t("Embeds")} icon={<LinkIcon color="currentColor" />}>
      <Heading>{t("Embeds")}</Heading>

      <Text type="secondary">
        <Trans>Configure team-wide embed settings</Trans>
      </Text>
    </Scene>
  );
}

export default observer(Diagrams);
