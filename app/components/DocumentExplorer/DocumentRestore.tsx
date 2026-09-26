import { observer } from "mobx-react";
import { useState, useMemo } from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import type { NavigationNode } from "@shared/types";
import { descendants, flattenTree } from "@shared/utils/tree";
import { performBatch } from "~/actions/definitions/common";
import type Document from "~/models/Document";
import Button from "~/components/Button";
import Text from "~/components/Text";
import useCollectionTrees from "~/hooks/useCollectionTrees";
import useStores from "~/hooks/useStores";
import { FlexContainer, Footer } from "./Components";
import DocumentExplorer from "./DocumentExplorer";

type Props = {
  /** The archived or deleted documents to restore */
  documents: Document[];
};

function DocumentRestore({ documents }: Props) {
  const { dialogs, policies } = useStores();
  const { t } = useTranslation();
  const collectionTrees = useCollectionTrees();
  const [restoring, setRestoring] = useState<boolean>(false);
  const [selectedPath, selectPath] = useState<NavigationNode | null>(null);
  const [first] = documents;

  const items = useMemo(() => {
    // The documents and their descendants cannot be a restore target.
    const allNodes = collectionTrees.flatMap(flattenTree);
    const excludedIds = new Set<string>();
    for (const document of documents) {
      excludedIds.add(document.id);
      const sourceNode = allNodes.find((node) => node.id === document.id);
      if (sourceNode) {
        descendants(sourceNode).forEach((n) => excludedIds.add(n.id));
      }
    }

    const filterSourceDocuments = (node: NavigationNode): NavigationNode => ({
      ...node,
      children: node.children
        ?.filter((c) => !excludedIds.has(c.id))
        .map(filterSourceDocuments),
    });

    return collectionTrees
      .map(filterSourceDocuments)
      .filter((node) =>
        node.collectionId
          ? policies.get(node.collectionId)?.abilities.createDocument
          : true
      );
  }, [policies, collectionTrees, documents]);

  const restore = async (path = selectedPath) => {
    if (!path) {
      toast.message(t("Select a location to restore"));
      return;
    }

    try {
      setRestoring(true);
      const collectionId = path.collectionId as string;
      const parentDocumentId = path.type === "document" ? path.id : null;

      const succeeded = await performBatch(documents, (document) =>
        document.restore({ collectionId, parentDocumentId })
      );
      if (!succeeded) {
        throw new Error("No documents were restored");
      }

      toast.success(
        documents.length === 1
          ? t("Document restored")
          : t("{{ count }} documents restored", { count: succeeded })
      );

      dialogs.closeAllModals();
    } catch (_err) {
      toast.error(
        documents.length === 1
          ? t("Couldn’t restore the document, try again?")
          : t("Couldn’t restore the documents, try again?")
      );
    } finally {
      setRestoring(false);
    }
  };

  return (
    <FlexContainer column>
      <DocumentExplorer
        items={items}
        onSubmit={restore}
        onSelect={selectPath}
        defaultValue={
          documents.length === 1
            ? first.parentDocumentId || first.collectionId || ""
            : ""
        }
      />
      <Footer justify="space-between" align="center" gap={8}>
        <Text ellipsis type="secondary">
          {selectedPath ? (
            <Trans
              defaults="Restore to <em>{{ location }}</em>"
              values={{
                location: selectedPath.title || t("Untitled"),
              }}
              components={{
                em: <strong />,
              }}
            />
          ) : (
            t("Select a location to restore")
          )}
        </Text>
        <Button disabled={!selectedPath || restoring} onClick={() => restore()}>
          {restoring ? `${t("Restoring")}…` : t("Restore")}
        </Button>
      </Footer>
    </FlexContainer>
  );
}

export default observer(DocumentRestore);
