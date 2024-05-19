import { EditIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import WebhookSubscription from "~/models/WebhookSubscription";
import Badge from "~/components/Badge";
import Button from "~/components/Button";
import ListItem from "~/components/List/Item";
import Modal from "~/components/Modal";
import useBoolean from "~/hooks/useBoolean";
import useStores from "~/hooks/useStores";
import WebhookSubscriptionRevokeDialog from "./WebhookSubscriptionDeleteDialog";
import WebhookSubscriptionEdit from "./WebhookSubscriptionEdit";

type Props = {
  webhook: WebhookSubscription;
};

const WebhookSubscriptionListItem = ({ webhook }: Props) => {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const [editModalOpen, handleEditModalOpen, handleEditModalClose] =
    useBoolean();

  const showDeletionConfirmation = React.useCallback(() => {
    dialogs.openModal({
      title: t("Delete webhook"),
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
        <>
          {webhook.name}
          {!webhook.enabled && (
            <StyledBadge yellow>{t("Disabled")}</StyledBadge>
          )}
        </>
      }
      subtitle={
        <>
          {t("Subscribed events")}: <code>{webhook.events.join(", ")}</code>
        </>
      }
      actions={
        <>
          <Button
            onClick={showDeletionConfirmation}
            icon={<TrashIcon />}
            neutral
          >
            {t("Delete")}
          </Button>
          <Button icon={<EditIcon />} onClick={handleEditModalOpen} neutral>
            {t("Edit")}
          </Button>
          <Modal
            title={t("Edit webhook")}
            onRequestClose={handleEditModalClose}
            isOpen={editModalOpen}
          >
            <WebhookSubscriptionEdit
              onSubmit={handleEditModalClose}
              webhookSubscription={webhook}
            />
          </Modal>
        </>
      }
    />
  );
};

const StyledBadge = styled(Badge)`
  position: absolute;
`;

export default WebhookSubscriptionListItem;
