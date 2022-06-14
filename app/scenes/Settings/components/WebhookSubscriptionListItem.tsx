import * as React from "react";
import { useTranslation } from "react-i18next";
import WebhookSubscription from "~/models/WebhookSubscription";
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
      title: t("Revoke token"),
      isCentered: true,
      content: (
        <WebhookSubscriptionRevokeDialog
          onSubmit={dialogs.closeAllModals}
          webhook={webhook}
        />
      ),
    });
  }, [t, dialogs, webhook]);

  const postfix = webhook.enabled ? "" : " (disabled)";
  const displayName = `${webhook.name}${postfix}`;
  return (
    <ListItem
      key={webhook.id}
      title={displayName}
      subtitle={
        <>
          Events: <code>{webhook.events.join(", ")}</code>
        </>
      }
      actions={
        <Button onClick={showDeletionConfirmation} neutral>
          Delete
        </Button>
      }
    />
  );
};

export default WebhookSubscriptionListItem;
