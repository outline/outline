import { observer } from "mobx-react";
import { useState, useMemo } from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import type { NavigationNode } from "@shared/types";
import { descendants, flattenTree } from "@shared/utils/tree";
import type Note from "~/models/Note";
import Button from "~/components/Button";
import Text from "~/components/Text";
import useNotebookTrees from "~/hooks/useNotebookTrees";
import useStores from "~/hooks/useStores";
import { FlexContainer, Footer } from "./Components";
import NoteExplorer from "./NoteExplorer";
type Props = {
  note: Note;
};
function NoteMove({ note }: Props) {
  const { dialogs, policies } = useStores();
  const { t } = useTranslation();
  const notebookTrees = useNotebookTrees();
  const [moving, setMoving] = useState<boolean>(false);
  const [selectedPath, selectPath] = useState<NavigationNode | null>(null);
  const items = useMemo(() => {
    // Collect the IDs of the note itself and all of its descendants so they
    // can be excluded from the move targets (moving to self or a descendant
    // would create a cycle; moving to the exact same location is a no-op).
    const allNodes = notebookTrees.flatMap(flattenTree);
    const sourceNode = allNodes.find((node) => node.id === note.id);
    const excludedIds = new Set<string>([note.id]);
    if (sourceNode) {
      descendants(sourceNode).forEach((n) => excludedIds.add(n.id));
    }
    // Recursively filter out the note itself and its descendants.
    // The note's current parent is intentionally kept so that siblings
    // remain visible as valid move targets.
    const filterSourceNote = (node: NavigationNode): NavigationNode => ({
      ...node,
      children: node.children
        ?.filter((c) => !excludedIds.has(c.id))
        .map(filterSourceNote),
    });
    const nodes = notebookTrees
      .map(filterSourceNote)
      // Filter out collections that we don't have permission to create documents in.
      .filter((node) =>
        node.notebookId
          ? policies.get(node.notebookId)?.abilities.createNote
          : true
      );
    return nodes;
  }, [policies, notebookTrees, note.id]);
  const move = async (path = selectedPath) => {
    if (!path) {
      toast.message(t("Select a location to move"));
      return;
    }
    try {
      setMoving(true);
      const { type, id: noteId } = path;
      const notebookId = path.notebookId as string;
      if (type === "document") {
        await note.move({ notebookId, parentNoteId: noteId });
      } else {
        await note.move({ notebookId });
      }
      toast.success(t("Document moved"));
      dialogs.closeAllModals();
    } catch (_err) {
      toast.error(t("Couldn’t move the document, try again?"));
    } finally {
      setMoving(false);
    }
  };
  return (
    <FlexContainer column>
      <NoteExplorer items={items} onSubmit={move} onSelect={selectPath} />
      <Footer justify="space-between" align="center" gap={8}>
        <Text ellipsis type="secondary">
          {selectedPath ? (
            <Trans
              defaults="Move to <em>{{ location }}</em>"
              values={{
                location: selectedPath.title || t("Untitled"),
              }}
              components={{
                em: <strong />,
              }}
            />
          ) : (
            t("Select a location to move")
          )}
        </Text>
        <Button disabled={!selectedPath || moving} onClick={() => move()}>
          {moving ? `${t("Moving")}…` : t("Move")}
        </Button>
      </Footer>
    </FlexContainer>
  );
}
export default observer(NoteMove);
