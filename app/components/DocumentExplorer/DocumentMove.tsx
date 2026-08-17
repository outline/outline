import { observer } from "mobx-react";
import { useState, useMemo } from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import type { NavigationNode } from "@shared/types";
import { NavigationNodeType } from "@shared/types";
import { descendants, flattenTree } from "@shared/utils/tree";
import type Document from "~/models/Document";
import Button from "~/components/Button";
import Text from "~/components/Text";
import useCollectionTrees from "~/hooks/useCollectionTrees";
import usePersonalDocumentsTree from "~/hooks/usePersonalDocumentsTree";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import { FlexContainer, Footer } from "./Components";
import DocumentExplorer from "./DocumentExplorer";

type Props = {
  document: Document;
};

function DocumentMove({ document }: Props) {
  const { dialogs, policies } = useStores();
  const { t } = useTranslation();
  const user = useCurrentUser();
  const collectionTrees = useCollectionTrees();
  const personalTrees = usePersonalDocumentsTree();
  const [moving, setMoving] = useState<boolean>(false);
  const [selectedPath, selectPath] = useState<NavigationNode | null>(null);

  const items = useMemo(() => {
    const trees = [...collectionTrees, ...personalTrees];

    // Collect the IDs of the document itself and all of its descendants so they
    // can be excluded from the move targets (moving to self or a descendant
    // would create a cycle; moving to the exact same location is a no-op).
    const allNodes = trees.flatMap(flattenTree);
    const sourceNode = allNodes.find((node) => node.id === document.id);
    const excludedIds = new Set<string>([document.id]);
    if (sourceNode) {
      descendants(sourceNode).forEach((n) => excludedIds.add(n.id));
    }

    // Recursively filter out the document itself and its descendants.
    // The document's current parent is intentionally kept so that siblings
    // remain visible as valid move targets.
    const filterSourceDocument = (node: NavigationNode): NavigationNode => ({
      ...node,
      children: node.children
        ?.filter((c) => !excludedIds.has(c.id))
        .map(filterSourceDocument),
    });

    return (
      trees
        .map(filterSourceDocument)
        // Filter out collections that we don't have permission to create documents in.
        .filter((node) =>
          node.collectionId
            ? policies.get(node.collectionId)?.abilities.createDocument
            : true
        )
    );
  }, [policies, collectionTrees, personalTrees, document.id]);

  const move = async (path = selectedPath) => {
    if (!path) {
      toast.message(t("Select a location to move"));
      return;
    }

    try {
      setMoving(true);

      if (path.type === NavigationNodeType.Personal) {
        await document.move({ personalOwnerId: user.id });
      } else {
        const { type, id: parentDocumentId } = path;

        const collectionId = path.collectionId as string;

        if (type === "document") {
          await document.move({ collectionId, parentDocumentId });
        } else {
          await document.move({ collectionId });
        }
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
      <DocumentExplorer items={items} onSubmit={move} onSelect={selectPath} />
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

export default observer(DocumentMove);
