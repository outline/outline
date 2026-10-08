import { EditIcon, PlusIcon, TrashIcon } from "outline-icons";
import stores from "~/stores";
import type WebhookSubscription from "~/models/WebhookSubscription";
import { dialogActionFactory } from "~/actions/definitions/common";
import { SettingsSection } from "~/actions/sections";
import WebhookSubscriptionDeleteDialog from "./components/WebhookSubscriptionDeleteDialog";
import WebhookSubscriptionEdit from "./components/WebhookSubscriptionEdit";
import WebhookSubscriptionNew from "./components/WebhookSubscriptionNew";

export const createWebhookSubscription = dialogActionFactory({
  analyticsName: "New webhook",
  section: SettingsSection,
  name: (t) => t("New webhook"),
  title: (t) => t("New webhook"),
  content: (onSubmit) => <WebhookSubscriptionNew onSubmit={onSubmit} />,
  icon: <PlusIcon />,
  keywords: "create",
  stopEvent: true,
  visible: () =>
    stores.policies.abilities(stores.auth.team?.id || "")
      .createWebhookSubscription,
});

export const editWebhookSubscriptionActionFactory = ({
  webhook,
}: {
  webhook: WebhookSubscription;
}) =>
  dialogActionFactory({
    analyticsName: "Edit webhook",
    section: SettingsSection,
    name: (t) => `${t("Edit")}…`,
    title: (t) => t("Edit webhook"),
    content: (onSubmit) => (
      <WebhookSubscriptionEdit
        onSubmit={onSubmit}
        webhookSubscription={webhook}
      />
    ),
    icon: <EditIcon />,
    stopEvent: true,
  });

export const deleteWebhookSubscriptionActionFactory = ({
  webhook,
}: {
  webhook: WebhookSubscription;
}) =>
  dialogActionFactory({
    analyticsName: "Delete webhook",
    section: SettingsSection,
    name: (t) => `${t("Delete")}…`,
    title: (t) => t("Delete webhook"),
    content: (onSubmit) => (
      <WebhookSubscriptionDeleteDialog onSubmit={onSubmit} webhook={webhook} />
    ),
    icon: <TrashIcon />,
    keywords: "delete remove",
    dangerous: true,
    stopEvent: true,
  });
