import type { ActionContext } from "~/types";
export const NotebookSection = ({ t }: ActionContext) => t("Notebook");
export const NotebooksSection = ({ t }: ActionContext) => t("Notebooks");
export const ActiveNotebookSection = ({ t, stores }: ActionContext) => {
  const activeNotebook = stores.notebooks.active;
  return `${t("Notebook")} · ${activeNotebook?.name}`;
};
ActiveNotebookSection.priority = 0.8;
export const DeveloperSection = ({ t }: ActionContext) => t("Debug");
export const DateSection = ({ t }: ActionContext) => t("Date");
DateSection.priority = 1;
export const NoteSection = ({ t }: ActionContext) => t("Document");
export const SearchResultsSection = ({ t }: ActionContext) =>
  t("Search results");
SearchResultsSection.priority = -1;
export const NotesSection = ({ t }: ActionContext) => t("Documents");
NotesSection.priority = 0.8;
export const ActiveNoteSection = ({ t, stores }: ActionContext) => {
  const activeNote = stores.notes.active;
  return `${t("Document")} · ${activeNote?.titleWithDefault}`;
};
ActiveNoteSection.priority = 0.9;
export const TemplateSection = ({ t }: ActionContext) => t("Template");
export const ActiveTemplateSection = ({ t, stores }: ActionContext) => {
  const activeTemplate = stores.templates.active;
  return `${t("Template")} · ${activeTemplate?.titleWithDefault}`;
};
ActiveTemplateSection.priority = 0.9;
export const RecentSection = ({ t }: ActionContext) => t("Recently viewed");
RecentSection.priority = 1;
export const RevisionSection = ({ t }: ActionContext) => t("Revision");
export const SettingsSection = ({ t }: ActionContext) => t("Settings");
export const NavigationSection = ({ t }: ActionContext) => t("Navigation");
export const NotificationSection = ({ t }: ActionContext) => t("Notification");
export const GroupSection = ({ t }: ActionContext) => t("Groups");
export const EmojiSecion = ({ t }: ActionContext) => t("Emoji");
export const UserSection = ({ t }: ActionContext) => t("People");
UserSection.priority = 0.5;
export const ShareSection = ({ t }: ActionContext) => t("Share");
export const TeamSection = ({ t }: ActionContext) => t("Workspace");
export const RecentSearchesSection = ({ t }: ActionContext) =>
  t("Recently viewed");
RecentSearchesSection.priority = -0.1;
export const TrashSection = ({ t }: ActionContext) => t("Trash");
