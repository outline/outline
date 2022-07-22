import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import WebhookSubscription from "~/models/WebhookSubscription";
import WebhookSubscriptionRevokeDialog from "~/scenes/Settings/components/WebhookSubscriptionDeleteDialog";
import WebhookSubscriptionEdit from "~/scenes/Settings/components/WebhookSubscriptionEdit";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Template from "~/components/ContextMenu/Template";
import Modal from "~/components/Modal";
import useBoolean from "~/hooks/useBoolean";
import useStores from "~/hooks/useStores";

type Props = {
  webhook: WebhookSubscription;
};

function WebhookMenu({ webhook }: Props) {
  const { t } = useTranslation();
  const menu = useMenuState();

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

  const [
    editModalOpen,
    handleEditModalOpen,
    handleEditModalClose,
  ] = useBoolean();

  return (
    <>
      <OverflowMenuButton aria-label={t("Show menu")} {...menu} />
      <ContextMenu {...menu} aria-label={t("Member options")}>
        <Template
          {...menu}
          items={[
            {
              type: "button",
              title: t("Delete"),
              dangerous: true,
              onClick: showDeletionConfirmation,
            },
            {
              type: "button",
              title: t("Edit"),
              dangerous: false,
              onClick: handleEditModalOpen,
            },
          ]}
        />
      </ContextMenu>
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
  );
}

export default WebhookMenu;
