import { observer } from "mobx-react";
import { useEffect, useState, useMemo } from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import type { NavigationNode } from "@shared/types";
import { ancestors, descendants, flattenTree } from "@shared/utils/tree";
import { performBatch } from "~/actions/definitions/common";
import type Document from "~/models/Document";
import Button from "~/components/Button";
import Text from "~/components/Text";
import useCollectionTrees from "~/hooks/useCollectionTrees";
import useStores from "~/hooks/useStores";
import { FlexContainer, Footer } from "./Components";
import DocumentExplorer from "./DocumentExplorer";

type Props = {
  /** The documents to move. */
  documents: Document[];
};

function DocumentMove({ documents }: Props) {
  const { collections, dialogs, policies } = useStores();
  const { t } = useTranslation();
  const collectionTrees = useCollectionTrees();
  const [moving, setMoving] = useState<boolean>(false);
  const [selectedPath, selectPath] = useState<NavigationNode | null>(null);
  const [treesFailed, setTreesFailed] = useState<boolean>(false);

  const sourceCollectionIds = useMemo(
    () =>
      Array.from(
        new Set(
          documents
            .map((document) => document.collectionId)
            .filter((id): id is string => !!id)
        )
      ),
    [documents]
  );

  // The source trees are needed to exclude descendants and to keep nesting,
  // so load any that have not been loaded yet.
  useEffect(() => {
    Promise.all(
      sourceCollectionIds
        .map((id) => collections.get(id))
        .filter((collection) => !!collection)
        .map((collection) => collection.fetchDocuments())
    ).catch(() => setTreesFailed(true));
  }, [collections, sourceCollectionIds]);

  const isLoadingTrees =
    !treesFailed &&
    sourceCollectionIds.some((id) => {
      const collection = collections.get(id);
      return !!collection && !collection.documents;
    });

  const { items, movableDocuments } = useMemo(() => {
    const selectedIds = new Set(documents.map((document) => document.id));
    const allNodes = collectionTrees.flatMap(flattenTree);
    const nodesById = new Map(allNodes.map((node) => [node.id, node]));

    // Exclude the documents and all of their descendants from the move targets
    // (moving to self or a descendant would create a cycle).
    const excludedIds = new Set(selectedIds);
    for (const id of selectedIds) {
      const sourceNode = nodesById.get(id);
      if (sourceNode) {
        descendants(sourceNode).forEach((n) => excludedIds.add(n.id));
      }
    }

    // Recursively filter out the documents and their descendants. The current
    // parents are intentionally kept so that siblings remain valid targets.
    const filterSourceDocuments = (node: NavigationNode): NavigationNode => ({
      ...node,
      children: node.children
        ?.filter((c) => !excludedIds.has(c.id))
        .map(filterSourceDocuments),
    });

    const nodes = collectionTrees
      .map(filterSourceDocuments)
      // Filter out collections that we don't have permission to create documents in.
      .filter((node) =>
        node.collectionId
          ? policies.get(node.collectionId)?.abilities.createDocument
          : true
      );

    // Documents nested under another selected document move along with it,
    // so only the outermost documents are moved to keep the structure. They
    // are moved in tree order to keep their relative order at the destination.
    const positions = new Map(allNodes.map((node, index) => [node.id, index]));
    const movable = documents
      .filter(
        (document) =>
          !ancestors(nodesById.get(document.id)).some((node) =>
            selectedIds.has(node.id)
          )
      )
      .sort(
        (a, b) =>
          (positions.get(a.id) ?? Infinity) - (positions.get(b.id) ?? Infinity)
      );

    return { items: nodes, movableDocuments: movable };
  }, [policies, collectionTrees, documents]);

  const move = async (path = selectedPath) => {
    if (isLoadingTrees) {
      return;
    }
    if (!path) {
      toast.message(t("Select a location to move"));
      return;
    }

    try {
      setMoving(true);
      const { type, id: parentDocumentId } = path;

      const collectionId = path.collectionId as string;
      const options =
        type === "document"
          ? { collectionId, parentDocumentId }
          : { collectionId };

      if (movableDocuments.length === 1) {
        await movableDocuments[0].move(options);
        toast.success(t("Document moved"));
      } else {
        const succeeded = await performBatch(movableDocuments, (document) =>
          document.move(options)
        );
        if (!succeeded) {
          toast.error(t("Couldn’t move the document, try again?"));
          return;
        }
        toast.success(t("{{ count }} document moved", { count: succeeded }));
      }

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
        <Button
          disabled={!selectedPath || moving || isLoadingTrees}
          onClick={() => move()}
        >
          {moving ? `${t("Moving")}…` : t("Move")}
        </Button>
      </Footer>
    </FlexContainer>
  );
}

export default observer(DocumentMove);
