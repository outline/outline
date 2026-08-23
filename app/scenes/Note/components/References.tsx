import { observer } from "mobx-react";
import { useEffect, useRef, Fragment, useMemo, useState } from "react";
import { Trans } from "react-i18next";
import styled from "styled-components";
import type Note from "~/models/Note";
import Fade from "~/components/Fade";
import { determineSidebarContext } from "~/components/Sidebar/components/SidebarContext";
import { Tab, Tabs } from "~/components/Tabs";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useStores from "~/hooks/useStores";
import ReferenceListItem from "./ReferenceListItem";
import useShare from "@shared/hooks/useShare";
import type { NavigationNode } from "@shared/types";
import { flattenTree } from "@shared/utils/tree";
type Props = {
  note: Note;
};
type TabType = "children" | "backlinks";
function References({ note }: Props) {
  const { notes } = useStores();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const locationSidebarContext = useLocationSidebarContext();
  const { sharedTree, isShare } = useShare();
  const [activeTab, setActiveTab] = useState<TabType>("children");
  const isJustCreated = useMemo(
    () => note.isJustCreated,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [note.id]
  );
  useEffect(() => {
    if (!isShare && !isJustCreated) {
      void notes.fetchRelationships(note.id);
    }
  }, [isShare, notes, note.id, isJustCreated]);
  const children = useChildren(note, sharedTree);
  const backlinks = useBacklinks(note, sharedTree);
  const showBacklinks = !!backlinks.length;
  const showChildNotes = !!children.length;
  const shouldFade = useRef(!showBacklinks && !showChildNotes);
  const isBacklinksTab = activeTab === "backlinks" || !showChildNotes;
  const height = Math.max(backlinks.length, children.length) * 40;
  const Component = shouldFade.current ? Fade : Fragment;
  return showBacklinks || showChildNotes ? (
    <Component>
      <Tabs>
        {showChildNotes && (
          <Tab
            active={!isBacklinksTab}
            onClick={() => setActiveTab("children")}
          >
            <Trans>Documents</Trans>
          </Tab>
        )}
        {showBacklinks && (
          <Tab
            active={isBacklinksTab}
            onClick={() => setActiveTab("backlinks")}
          >
            <Trans>Backlinks</Trans>
          </Tab>
        )}
      </Tabs>
      <Content style={{ height }}>
        {showBacklinks && (
          <List $active={isBacklinksTab}>
            {backlinks.map((node) => {
              // If we have the note in the store already then use it to get the extra
              // contextual info, otherwise the collection node will do (only has title and id)
              const backlinkedNote = notes.get(node.id);
              return (
                <ReferenceListItem
                  anchor={backlinkedNote?.urlId}
                  key={node.id}
                  note={backlinkedNote || node}
                  showNotebook={backlinkedNote?.notebookId !== note.notebookId}
                  sidebarContext={
                    user && backlinkedNote
                      ? determineSidebarContext({
                          note: backlinkedNote,
                          user,
                          currentContext: locationSidebarContext,
                        })
                      : undefined
                  }
                />
              );
            })}
          </List>
        )}
        {showChildNotes && (
          <List $active={!isBacklinksTab}>
            {children.map((node) => {
              // If we have the note in the store already then use it to get the extra
              // contextual info, otherwise the collection node will do (only has title and id)
              const note = notes.get(node.id);
              return (
                <ReferenceListItem
                  key={node.id}
                  note={note || node}
                  showNotebook={false}
                  sidebarContext={locationSidebarContext}
                />
              );
            })}
          </List>
        )}
      </Content>
    </Component>
  ) : null;
}
/**
 * Hook to get the children of a note, filtering from the shared tree if available.
 *
 * @param note - the note to get children for.
 * @param sharedTree - the shared tree to filter from, if available.
 * @returns the children of the note.
 */
function useChildren(
  note: Note,
  sharedTree: NavigationNode | undefined
): NavigationNode[] {
  return useMemo(() => {
    if (!sharedTree) {
      return note.children;
    }
    function findChildren(node: NavigationNode): NavigationNode[] | undefined {
      if (node.id === note.id) {
        return node.children;
      }
      for (const child of node.children) {
        const result = findChildren(child);
        if (result) {
          return result;
        }
      }
      return undefined;
    }
    return findChildren(sharedTree) || [];
  }, [note.id, note.children, sharedTree]);
}
/**
 * Hook to get backlinks for a note, filtering from the shared tree if available.
 *
 * @param note - the note to get backlinks for.
 * @returns notes that link to this note.
 */
function useBacklinks(
  note: Note,
  sharedTree: NavigationNode | undefined
): Note[] {
  if (sharedTree) {
    return flattenTree(sharedTree).filter((node) =>
      note.backlinkIds?.includes(node.id)
    ) as Note[];
  }
  return note.backlinks;
}
const Content = styled.div`
  position: relative;
`;
const List = styled.ul<{
  $active: boolean;
}>`
  visibility: ${({ $active }) => ($active ? "visible" : "hidden")};
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  list-style: none;
  margin: 0;
  padding: 0;
`;
export default observer(References);
