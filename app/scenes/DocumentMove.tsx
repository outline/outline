import { observer } from "mobx-react";
import { useState, useMemo } from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { ellipsis } from "@shared/styles";
import { NavigationNode } from "@shared/types";
import Document from "~/models/Document";
import Button from "~/components/Button";
import DocumentExplorer from "~/components/DocumentExplorer";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useCollectionTrees from "~/hooks/useCollectionTrees";
import useStores from "~/hooks/useStores";

type Props = {
  documents: Document[];
  onSubmit?: () => void;
};

function DocumentMove({ documents, onSubmit }: Props) {
  const { dialogs, policies } = useStores();
  const { t } = useTranslation();
  const collectionTrees = useCollectionTrees();
  const [selectedPath, selectPath] = useState<NavigationNode | null>(null);
  const [isMoving, setMoving] = useState(false);

  const isBulkAction = documents.length > 1;
  const documentIds = useMemo(
    () => new Set(documents.map((doc) => doc.id)),
    [documents]
  );

  const items = useMemo(() => {
    // Recursively filter out the document itself and its existing parent doc, if any.
    const filterSourceDocument = (node: NavigationNode): NavigationNode => ({
      ...node,
      children: node.children
        ?.filter((c) => {
          // if multiple documents are selected we want to only filter out the selected documents.
          if (isBulkAction) {
            return !documentIds.has(c.id);
          }

          return (
            c.id !== documents[0].id && c.id !== documents[0].parentDocumentId
          );
        })
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

    // If the document we're moving is a template, only show collections as
    // move targets.
    const hasTemplates = documents.some((doc) => doc.isTemplate);
    if (hasTemplates) {
      return nodes
        .filter((node) => node.type === "collection")
        .map((node) => ({ ...node, children: [] }));
    }
    return nodes;
  }, [policies, collectionTrees, documentIds, documents, isBulkAction]);

  const move = async () => {
    if (!selectedPath) {
      toast.message(t("Select a location to move"));
      return;
    }

    setMoving(true);

    try {
      const { type, id: parentDocumentId } = selectedPath;
      const collectionId = selectedPath.collectionId as string;

      let successCount = 0;
      let errorCount = 0;

      for (const document of documents) {
        try {
          if (type === "document") {
            await document.move({ collectionId, parentDocumentId });
          } else {
            await document.move({ collectionId });
          }
          successCount++;
        } catch {
          errorCount++;
        }
      }

      onSubmit?.();
      if (!isBulkAction) {
        toast.success(t("Document moved"));
      } else {
        if (errorCount === 0) {
          toast.success(
            t("{{ count }} documents moved", { count: successCount })
          );
        } else {
          toast.warning(
            t("{{ successCount }} moved, {{ errorCount }} failed", {
              successCount,
              errorCount,
            })
          );
        }
      }

      dialogs.closeAllModals();
    } catch (_err) {
      toast.error(t("Couldn’t move the document, try again?"));
    } finally {
      setMoving(false);
    }
  };

  const SelectedPathFooter = ({ title }: { title: string }) =>
    isBulkAction ? (
      <Trans
        defaults="Move {{ count }} documents to <em>{{ location }}</em>"
        values={{
          count: documents.length,
          location: title || t("Untitled"),
        }}
        components={{
          em: <strong />,
        }}
      />
    ) : (
      <Trans
        defaults="Move to <em>{{ location }}</em>"
        values={{
          location: title || t("Untitled"),
        }}
        components={{
          em: <strong />,
        }}
      />
    );

  const NoSelectedPathFooter = isBulkAction
    ? t("Select a location to move {{ count }} documents", {
        count: documents.length,
      })
    : t("Select a location to move");

  return (
    <FlexContainer column>
      <DocumentExplorer items={items} onSubmit={move} onSelect={selectPath} />
      <Footer justify="space-between" align="center" gap={8}>
        <StyledText type="secondary">
          {selectedPath ? (
            <SelectedPathFooter title={selectedPath.title} />
          ) : (
            NoSelectedPathFooter
          )}
        </StyledText>
        <Button disabled={!selectedPath || isMoving} onClick={move}>
          {isMoving ? `${t("Moving")}…` : t("Move")}
        </Button>
      </Footer>
    </FlexContainer>
  );
}

export const FlexContainer = styled(Flex)`
  margin-left: -24px;
  margin-right: -24px;
  margin-bottom: -24px;
  outline: none;
`;

export const Footer = styled(Flex)`
  height: 64px;
  border-top: 1px solid ${(props) => props.theme.horizontalRule};
  padding-left: 24px;
  padding-right: 24px;
`;

export const StyledText = styled(Text)`
  ${ellipsis()}
  margin-bottom: 0;
`;

export default observer(DocumentMove);
