import { Trans, useTranslation } from "react-i18next";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Text from "~/components/Text";
import type { IntegrationType } from "@shared/types";
import type Integration from "~/models/Integration";
import useStores from "~/hooks/useStores";
import { useHistory } from "react-router-dom";
import { settingsPath } from "~/utils/routeHelpers";
import { observer } from "mobx-react";
import capitalize from "lodash/capitalize";

type Props = {
  integration: Integration<IntegrationType.Analytics>;
};

export const DisconnectAnalyticsDialog = observer(({ integration }: Props) => {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const history = useHistory();

  const handleSubmit = async () => {
    await integration.delete();
    history.push(settingsPath("integrations"));
    dialogs.closeAllModals();
  };

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("Disconnect")}
      savingText={`${t("Disconnecting")}…`}
      danger
    >
      <Text as="p" type="secondary">
        <Trans
          defaults="Are you sure you want to disconnect the <em>{{ service }}</em> integration?"
          values={{
            service: capitalize(integration.service),
          }}
          components={{
            em: <strong />,
          }}
        />
      </Text>
      <Text as="p" type="secondary">
        <Trans defaults="This will stop sending analytics events to the configured instance." />
      </Text>
    </ConfirmationDialog>
  );
});
