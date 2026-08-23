import { DocumentIcon, QuestionMarkIcon } from "outline-icons";
import * as React from "react";
import Icon from "@shared/components/Icon";
import CollectionIcon from "~/components/Icons/NotebookIcon";
import useStores from "~/hooks/useStores";
interface SidebarItem {
  noteId?: string;
  notebookId?: string;
  groupId?: string;
}
export function useSidebarLabelAndIcon({
  noteId,
  notebookId,
  groupId,
}: SidebarItem) {
  const { notebooks, notes } = useStores();
  const icon = <QuestionMarkIcon />;
  if (noteId) {
    const note = notes.get(noteId);
    if (note) {
      return {
        label: note.titleWithDefault,
        icon: note.icon ? (
          <Icon
            value={note.icon}
            initial={note.initial}
            color={note.color ?? undefined}
          />
        ) : groupId ? null : (
          <DocumentIcon outline={note.isDraft} />
        ),
      };
    }
  }
  if (notebookId) {
    const notebook = notebooks.get(notebookId);
    if (notebook) {
      return {
        label: notebook.name,
        icon: <CollectionIcon notebook={notebook} />,
      };
    }
  }
  return {
    label: "",
    icon,
  };
}
