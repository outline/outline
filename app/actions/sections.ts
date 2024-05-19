import { ActionContext } from "~/types";

export const CollectionSection = ({ t }: ActionContext) => t("Collection");

export const DeveloperSection = ({ t }: ActionContext) => t("Debug");

export const DocumentSection = ({ t }: ActionContext) => t("Document");

export const RevisionSection = ({ t }: ActionContext) => t("Revision");

export const SettingsSection = ({ t }: ActionContext) => t("Settings");

export const NavigationSection = ({ t }: ActionContext) => t("Navigation");

export const NotificationSection = ({ t }: ActionContext) => t("Notification");

export const UserSection = ({ t }: ActionContext) => t("People");

export const TeamSection = ({ t }: ActionContext) => t("Workspace");

export const RecentSearchesSection = ({ t }: ActionContext) =>
  t("Recent searches");

export const TrashSection = ({ t }: ActionContext) => t("Trash");
