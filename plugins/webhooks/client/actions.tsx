import { EditIcon, PlusIcon, TrashIcon } from "outline-icons";
import stores from "~/stores";
import type WebhookSubscription from "~/models/WebhookSubscription";
import { createAction } from "~/actions";
import { SettingsSection } from "~/actions/sections";
import WebhookSubscriptionDeleteDialog from "./components/WebhookSubscriptionDeleteDialog";
import WebhookSubscriptionEdit from "./components/WebhookSubscriptionEdit";
import WebhookSubscriptionNew from "./components/WebhookSubscriptionNew";

export const createWebhookSubscription = createAction({
  name: ({ t }) => t("New webhook"),
  analyticsName: "New webhook",
  section: SettingsSection,
  icon: <PlusIcon />,
  keywords: "create",
  visible: () =>
    stores.policies.abilities(stores.auth.team?.id || "")
      .createWebhookSubscription,
  perform: ({ t, event }) => {
    event?.preventDefault();
    event?.stopPropagation();

    stores.dialogs.openModal({
      title: t("New webhook"),
      content: (
        <WebhookSubscriptionNew onSubmit={stores.dialogs.closeAllModals} />
      ),
    });
  },
});

export const editWebhookSubscriptionFactory = ({
  webhook,
}: {
  webhook: WebhookSubscription;
}) =>
  createAction({
    name: ({ t }) => `${t("Edit")}…`,
    analyticsName: "Edit webhook",
    section: SettingsSection,
    icon: <EditIcon />,
    perform: ({ t, event }) => {
      event?.preventDefault();
      event?.stopPropagation();

      stores.dialogs.openModal({
        title: t("Edit webhook"),
        content: (
          <WebhookSubscriptionEdit
            onSubmit={stores.dialogs.closeAllModals}
            webhookSubscription={webhook}
          />
        ),
      });
    },
  });

export const deleteWebhookSubscriptionFactory = ({
  webhook,
}: {
  webhook: WebhookSubscription;
}) =>
  createAction({
    name: ({ t }) => `${t("Delete")}…`,
    analyticsName: "Delete webhook",
    section: SettingsSection,
    icon: <TrashIcon />,
    keywords: "delete remove",
    dangerous: true,
    perform: ({ t, event }) => {
      event?.preventDefault();
      event?.stopPropagation();

      stores.dialogs.openModal({
        title: t("Delete webhook"),
        content: (
          <WebhookSubscriptionDeleteDialog
            onSubmit={stores.dialogs.closeAllModals}
            webhook={webhook}
          />
        ),
      });
    },
  });
