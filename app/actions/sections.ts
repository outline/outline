import { ActionContext } from "~/types";

export const CollectionSection = ({ t }: ActionContext) => t("Collection");

export const DebugSection = ({ t }: ActionContext) => t("Debug");

export const DocumentSection = ({ t }: ActionContext) => t("Document");

export const SettingsSection = ({ t }: ActionContext) => t("Settings");

export const NavigationSection = ({ t }: ActionContext) => t("Navigation");

export const UserSection = ({ t }: ActionContext) => t("People");

export const RecentSearchesSection = ({ t }: ActionContext) =>
  t("Recent searches");
