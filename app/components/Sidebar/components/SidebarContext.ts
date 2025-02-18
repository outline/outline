import * as React from "react";
import Document from "~/models/Document";
import User from "~/models/User";

export type SidebarContextType =
  | "collections"
  | "shared"
  | "archive"
  | `group-${string}`
  | `starred-${string}`
  | undefined;

const SidebarContext = React.createContext<SidebarContextType>(undefined);

export const useSidebarContext = () => React.useContext(SidebarContext);

export const groupSidebarContext = (groupId: string): SidebarContextType =>
  `group-${groupId}`;

export const starredSidebarContext = (modelId: string): SidebarContextType =>
  `starred-${modelId}`;

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
