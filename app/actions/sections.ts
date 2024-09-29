import { ActionContext } from "~/types";

export const CollectionSection = ({ t }: ActionContext) => t("Collection");

export const ActiveCollectionSection = ({ t, stores }: ActionContext) => {
  const activeCollection = stores.collections.active;
  return `${t("Collection")} · ${activeCollection?.name}`;
};

ActiveCollectionSection.priority = 0.8;

export const DeveloperSection = ({ t }: ActionContext) => t("Debug");

export const DocumentSection = ({ t }: ActionContext) => t("Document");

export const ActiveDocumentSection = ({ t, stores }: ActionContext) => {
  const activeDocument = stores.documents.active;
  return `${t("Document")} · ${activeDocument?.titleWithDefault}`;
};

ActiveDocumentSection.priority = 0.9;

export const RecentSection = ({ t }: ActionContext) => t("Recently viewed");

RecentSection.priority = 1;

export const RevisionSection = ({ t }: ActionContext) => t("Revision");

export const SettingsSection = ({ t }: ActionContext) => t("Settings");

export const NavigationSection = ({ t }: ActionContext) => t("Navigation");

export const NotificationSection = ({ t }: ActionContext) => t("Notification");

export const UserSection = ({ t }: ActionContext) => t("People");

export const TeamSection = ({ t }: ActionContext) => t("Workspace");

export const RecentSearchesSection = ({ t }: ActionContext) =>
  t("Recent searches");

RecentSearchesSection.priority = -0.1;

export const TrashSection = ({ t }: ActionContext) => t("Trash");
