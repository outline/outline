import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Icon from "@shared/components/Icon";
import type { NavigationNode } from "@shared/types";
import type Notebook from "~/models/Notebook";
import type Note from "~/models/Note";
import useStores from "~/hooks/useStores";
import { sharedModelPath } from "~/utils/routeHelpers";
import { useSidebarExpansion } from "./SidebarExpansionContext";
import SidebarLink from "./SidebarLink";
type Props = {
  node: NavigationNode;
  notebook?: Notebook;
  activeNoteId?: string;
  activeNote?: Note;
  prefetchNote?: (noteId: string) => Promise<Note | void>;
  isDraft?: boolean;
  depth: number;
  index: number;
  shareId: string;
  parentId?: string;
};
function NoteLink(
  {
    node,
    notebook,
    activeNote,
    activeNoteId,
    prefetchNote,
    isDraft,
    depth,
    shareId,
  }: Props,
  ref: React.RefObject<HTMLAnchorElement>
) {
  const { notes } = useStores();
  const { t } = useTranslation();
  const expansion = useSidebarExpansion();
  const isActiveNote = activeNoteId === node.id;
  const hasChildNotes =
    !!node.children.length || activeNote?.parentNoteId === node.id;
  const note = notes.get(node.id);
  // Auto-expand top-level nodes (depth <= 1) on initial render
  React.useEffect(() => {
    if (hasChildNotes && depth <= 1 && !expansion.isExpanded(node.id)) {
      expansion.expand(node.id);
    }
  }, [expansion, node.id, hasChildNotes, depth]);
  const expanded = expansion.isExpanded(node.id);
  const handleDisclosureClick = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (expanded) {
        const altKey = "altKey" in ev && (ev as React.MouseEvent).altKey;
        if (altKey) {
          expansion.collapseDescendants(node);
        } else {
          expansion.collapse(node.id);
        }
      } else {
        const altKey = "altKey" in ev && (ev as React.MouseEvent).altKey;
        if (altKey) {
          expansion.expandDescendants(node);
        } else {
          expansion.expand(node.id);
        }
      }
    },
    [expanded, expansion, node]
  );
  const nodeChildren = React.useMemo(() => {
    if (
      activeNote?.isDraft &&
      activeNote?.isActive &&
      activeNote?.parentNoteId === node.id
    ) {
      return [activeNote?.asNavigationNode, ...node.children];
    }
    return node.children;
  }, [
    activeNote?.isActive,
    activeNote?.isDraft,
    activeNote?.parentNoteId,
    activeNote?.asNavigationNode,
    node,
  ]);
  const handlePrefetch = React.useCallback(() => {
    void prefetchNote?.(node.id);
  }, [prefetchNote, node]);
  const title =
    (activeNote?.id === node.id ? activeNote.title : node.title) ||
    t("Untitled");
  const icon = node.icon ?? node.emoji;
  const initial = title ? title.charAt(0).toUpperCase() : "?";
  return (
    <>
      <SidebarLink
        to={{
          pathname: sharedModelPath(shareId, node.url),
          state: {
            title: node.title,
          },
        }}
        expanded={hasChildNotes && depth !== 0 ? expanded : undefined}
        onDisclosureClick={handleDisclosureClick}
        onClickIntent={handlePrefetch}
        icon={
          icon && <Icon value={icon} color={node.color} initial={initial} />
        }
        label={title}
        depth={depth}
        exact={false}
        scrollIntoViewIfNeeded={!note?.isStarred}
        isDraft={isDraft}
        ref={ref}
        isActive={() => !!isActiveNote}
      />
      {expanded &&
        nodeChildren.map((childNode, index) => (
          <SharedNoteLink
            shareId={shareId}
            key={childNode.id}
            notebook={notebook}
            node={childNode}
            activeNoteId={activeNoteId}
            activeNote={activeNote}
            prefetchNote={prefetchNote}
            isDraft={childNode.isDraft}
            depth={depth + 1}
            index={index}
            parentId={node.id}
          />
        ))}
    </>
  );
}
export const SharedNoteLink = observer(React.forwardRef(NoteLink));
