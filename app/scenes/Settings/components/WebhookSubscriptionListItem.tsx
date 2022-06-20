import * as React from "react";
import { useTranslation } from "react-i18next";
import WebhookSubscription from "~/models/WebhookSubscription";
import Badge from "~/components/Badge";
import Button from "~/components/Button";
import ListItem from "~/components/List/Item";
import useStores from "~/hooks/useStores";
import WebhookSubscriptionRevokeDialog from "./WebhookSubscriptionDeleteDialog";

type Props = {
  webhook: WebhookSubscription;
};

const WebhookSubscriptionListItem = ({ webhook }: Props) => {
  const { t } = useTranslation();
  const { dialogs } = useStores();

  const showDeletionConfirmation = React.useCallback(() => {
    dialogs.openModal({
      title: t("Delete webhook"),
      isCentered: true,
      content: (
        <WebhookSubscriptionRevokeDialog
          onSubmit={dialogs.closeAllModals}
          webhook={webhook}
        />
      ),
    });
  }, [t, dialogs, webhook]);

  return (
    <ListItem
      key={webhook.id}
      title={
        <p>
          {webhook.name}
          {!webhook.enabled && <Badge yellow={true}>{t("disabled")}</Badge>}
        </p>
      }
      subtitle={
        <>
          {t("Subscribed events")}: <code>{webhook.events.join(", ")}</code>
        </>
      }
      actions={
        <Button onClick={showDeletionConfirmation} neutral>
          {t("Delete")}
        </Button>
      }
    />
  );
};

export default WebhookSubscriptionListItem;
