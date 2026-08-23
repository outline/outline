import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import Icon from "@shared/components/Icon";
import type { NavigationNode } from "@shared/types";
import useStores from "~/hooks/useStores";
import { sharedModelPath } from "~/utils/routeHelpers";
import { SharedNoteLink } from "./SharedNoteLink";
import SidebarLink from "./SidebarLink";
type Props = {
  node: NavigationNode;
  shareId: string;
  hideRootNode?: boolean;
};
function NotebookLink({ node, shareId, hideRootNode }: Props) {
  const { t } = useTranslation();
  const { notes, ui } = useStores();
  const icon = node.icon ?? node.emoji;
  return (
    <>
      {!hideRootNode && (
        <SidebarLink
          to={{
            pathname: sharedModelPath(shareId),
            state: {
              title: node.title,
            },
          }}
          icon={
            icon && (
              <Icon value={icon} initial={node.title} color={node.color} />
            )
          }
          label={node.title || t("Untitled")}
          depth={0}
          exact={false}
          scrollIntoViewIfNeeded={true}
          isActive={() => ui.activeNotebookId === node.id}
        />
      )}
      {node.children.map((childNode, index) => (
        <SharedNoteLink
          key={childNode.id}
          index={index}
          depth={hideRootNode ? 1 : 2}
          shareId={shareId}
          node={childNode}
          prefetchNote={notes.prefetchNote}
          activeNoteId={ui.activeNoteId}
          activeNote={notes.active}
        />
      ))}
    </>
  );
}
export const SharedNotebookLink = observer(NotebookLink);
