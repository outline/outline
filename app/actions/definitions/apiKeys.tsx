import { PlusIcon, TrashIcon } from "outline-icons";
import stores from "~/stores";
import ApiKey from "~/models/ApiKey";
import ApiKeyNew from "~/scenes/ApiKeyNew";
import ApiKeyRevokeDialog from "~/scenes/Settings/components/ApiKeyRevokeDialog";
import { createAction, createActionV2 } from "..";
import { SettingsSection } from "../sections";

export const createApiKey = createAction({
  name: ({ t }) => t("New API key"),
  analyticsName: "New API key",
  section: SettingsSection,
  icon: <PlusIcon />,
  keywords: "create",
  visible: () =>
    stores.policies.abilities(stores.auth.team?.id || "").createApiKey,
  perform: ({ t, event }) => {
    event?.preventDefault();
    event?.stopPropagation();

    stores.dialogs.openModal({
      title: t("New API key"),
      content: <ApiKeyNew onSubmit={stores.dialogs.closeAllModals} />,
    });
  },
});

export const revokeApiKeyFactory = ({ apiKey }: { apiKey: ApiKey }) =>
  createActionV2({
    name: ({ t, isContextMenu }) =>
      isContextMenu
        ? apiKey.isExpired
          ? t("Delete")
          : `${t("Revoke")}…`
        : t("Revoke API key"),
    analyticsName: "Revoke API key",
    section: SettingsSection,
    icon: <TrashIcon />,
    keywords: "revoke delete remove",
    dangerous: true,
    perform: async ({ t, event }) => {
      event?.preventDefault();
      event?.stopPropagation();

      if (apiKey.isExpired) {
        await apiKey.delete();
        return;
      }

      stores.dialogs.openModal({
        title: t("Revoke token"),
        content: (
          <ApiKeyRevokeDialog
            onSubmit={stores.dialogs.closeAllModals}
            apiKey={apiKey}
          />
        ),
      });
    },
  });
