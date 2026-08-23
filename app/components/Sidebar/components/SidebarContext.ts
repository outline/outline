import { createContext, useContext } from "react";
import type Note from "~/models/Note";
import type User from "~/models/User";
export type SidebarContextType =
  | "notebooks"
  /** @deprecated Use "notebooks" instead. */
  | "collections"
  | "shared"
  | "archive"
  | `group-${string}`
  | `starred-${string}`
  | undefined;
const SidebarContext = createContext<SidebarContextType>(undefined);
/**
 * Converts legacy sidebar context values to their canonical names.
 *
 * @param context the sidebar context to normalize.
 * @returns the canonical sidebar context.
 */
export const normalizeSidebarContext = (
  context: SidebarContextType
): SidebarContextType => (context === "collections" ? "notebooks" : context);
export const useSidebarContext = () => useContext(SidebarContext);
export const groupSidebarContext = (groupId: string): SidebarContextType =>
  `group-${groupId}`;
export const starredSidebarContext = (modelId: string): SidebarContextType =>
  `starred-${modelId}`;
export const determineSidebarContext = ({
  note,
  user,
  currentContext,
}: {
  note: Note;
  user: User;
  currentContext?: SidebarContextType;
}): SidebarContextType => {
  const isStarred = note.isStarred || !!note.notebook?.isStarred;
  const preferStarred = !currentContext || currentContext.startsWith("starred");
  if (isStarred && preferStarred) {
    const currentlyInStarredNotebook =
      currentContext === starredSidebarContext(note.notebookId ?? "");
    return note.isStarred && !currentlyInStarredNotebook
      ? starredSidebarContext(note.id)
      : starredSidebarContext(note.notebookId!);
  }
  if (note.notebook) {
    return note.notebook.isArchived ? "archive" : "notebooks";
  } else if (user.noteMemberships.find((m) => m.noteId === note.id)) {
    return "shared";
  } else {
    const group = user.groupsWithNoteMemberships.find(
      (g) => !!g.noteMemberships.find((m) => m.noteId === note.id)
    );
    return groupSidebarContext(group?.id ?? "");
  }
};
export default SidebarContext;
