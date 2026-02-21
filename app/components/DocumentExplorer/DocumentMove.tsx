import { observer } from "mobx-react";
import { useState, useMemo } from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import type { NavigationNode } from "@shared/types";
import type Document from "~/models/Document";
import Button from "~/components/Button";
import Text from "~/components/Text";
import useCollectionTrees from "~/hooks/useCollectionTrees";
import useStores from "~/hooks/useStores";
import { FlexContainer, Footer } from "./Components";
import DocumentExplorer from "./DocumentExplorer";

type Props = {
  document: Document;
};

function DocumentMove({ document }: Props) {
  const { dialogs, policies } = useStores();
  const { t } = useTranslation();
  const collectionTrees = useCollectionTrees();
  const [moving, setMoving] = useState<boolean>(false);
  const [selectedPath, selectPath] = useState<NavigationNode | null>(null);

  const items = useMemo(() => {
    // Recursively filter out the document itself and its existing parent doc, if any.
    const filterSourceDocument = (node: NavigationNode): NavigationNode => ({
      ...node,
      children: node.children
        ?.filter(
          (c) => c.id !== document.id && c.id !== document.parentDocumentId
        )
        .map(filterSourceDocument),
    });

    const nodes = collectionTrees
      .map(filterSourceDocument)
      // Filter out collections that we don't have permission to create documents in.
      .filter((node) =>
        node.collectionId
          ? policies.get(node.collectionId)?.abilities.createDocument
          : true
      );

    return nodes;
  }, [policies, collectionTrees, document.id, document.parentDocumentId]);

  const move = async () => {
    if (!selectedPath) {
      toast.message(t("Select a location to move"));
      return;
    }

    try {
      setMoving(true);
      const { type, id: parentDocumentId } = selectedPath;

      const collectionId = selectedPath.collectionId as string;

      if (type === "document") {
        await document.move({ collectionId, parentDocumentId });
      } else {
        await document.move({ collectionId });
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
        <Button disabled={!selectedPath || moving} onClick={move}>
          {moving ? `${t("Moving")}…` : t("Move")}
        </Button>
      </Footer>
    </FlexContainer>
  );
}

export default observer(DocumentMove);
