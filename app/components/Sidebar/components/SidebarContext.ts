import { createContext, useContext } from "react";
import type Document from "~/models/Document";
import type User from "~/models/User";

export type SidebarContextType =
  | "collections"
  | "shared"
  | "archive"
  | `group-${string}`
  | `starred-${string}`
  | undefined;

const SidebarContext = createContext<SidebarContextType>(undefined);

export const useSidebarContext = () => useContext(SidebarContext);

export const groupSidebarContext = (groupId: string): SidebarContextType =>
  `group-${groupId}`;

export const starredSidebarContext = (modelId: string): SidebarContextType =>
  `starred-${modelId}`;

/**
 * Whether a sidebar context matches the active sidebar context. When no context
 * is active, the collections context is treated as active.
 *
 * @param sidebarContext the context to check.
 * @param activeSidebarContext the active context.
 * @returns true if the context is active.
 */
export const isActiveSidebarContext = (
  sidebarContext: SidebarContextType,
  activeSidebarContext: SidebarContextType
): boolean =>
  sidebarContext === activeSidebarContext ||
  (!activeSidebarContext && sidebarContext === "collections");

export const determineSidebarContext = ({
  document,
  user,
  currentContext,
}: {
  document: Document;
  user: User;
  currentContext?: SidebarContextType;
}): SidebarContextType => {
  const isStarred = document.isStarred || !!document.collection?.isStarred;
  const preferStarred = !currentContext || currentContext.startsWith("starred");

  if (isStarred && preferStarred) {
    const currentlyInStarredCollection =
      currentContext === starredSidebarContext(document.collectionId ?? "");

    return document.isStarred && !currentlyInStarredCollection
      ? starredSidebarContext(document.id)
      : starredSidebarContext(document.collectionId!);
  }

  if (document.collection) {
    return document.collection.isArchived ? "archive" : "collections";
  } else if (
    user.documentMemberships.find((m) => m.documentId === document.id)
  ) {
    return "shared";
  } else {
    const group = user.groupsWithDocumentMemberships.find(
      (g) => !!g.documentMemberships.find((m) => m.documentId === document.id)
    );
    return groupSidebarContext(group?.id ?? "");
  }
};

export default SidebarContext;
