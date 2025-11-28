import { observer } from "mobx-react";
import { useState, useMemo, useEffect } from "react";
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
  documents: string[]; // Array of document IDs
};

function DocumentMove({ documents }: Props) {
  const { dialogs, policies, documents: documentStore } = useStores();
  const { t } = useTranslation();
  const collectionTrees = useCollectionTrees();
  const [selectedPath, selectPath] = useState<NavigationNode | null>(null);
  const [fetchedDocuments, setFetchedDocuments] = useState<Document[]>([]);

  // Fetch all documents
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const promises = documents.map((id) => documentStore.fetch(id));
        const docs = await Promise.all(promises);
        const validDocs = docs.filter(Boolean) as Document[];
        setFetchedDocuments(validDocs);
      } catch {
        // any errors are handled on move
        setFetchedDocuments([]);
      }
    };

    fetchDocuments();
  }, [documents, documentStore]);

  const items = useMemo(() => {
    if (fetchedDocuments.length === 0) {
      return [];
    }

    // Get all document IDs and parent IDs to filter out
    const documentIdsSet = new Set(fetchedDocuments.map((doc) => doc.id));
    const parentDocumentIds = new Set(
      fetchedDocuments
        .map((doc) => doc.parentDocumentId)
        .filter(Boolean) as string[]
    );

    // Recursively filter out the documents themselves and their existing parent docs
    const filterSourceDocuments = (node: NavigationNode): NavigationNode => ({
      ...node,
      children: node.children
        ?.filter(
          (c) => !documentIdsSet.has(c.id) && !parentDocumentIds.has(c.id)
        )
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

    // If any of the documents we're moving are templates, only show collections as
    // move targets.
    const hasTemplates = fetchedDocuments.some((doc) => doc.isTemplate);
    if (hasTemplates) {
      return nodes
        .filter((node) => node.type === "collection")
        .map((node) => ({ ...node, children: [] }));
    }
    return nodes;
  }, [policies, collectionTrees, fetchedDocuments]);

  const move = async () => {
    if (!selectedPath) {
      toast.message(t("Select a location to move"));
      return;
    }

    if (fetchedDocuments.length === 0) {
      const isPlural = documents.length > 1;
      toast.error(
        isPlural
          ? t("Couldn't move the documents, try again?")
          : t("Couldn't move the document, try again?")
      );
      return;
    }

    // Check if user has permission to move all documents
    const hasPermissionIssue = fetchedDocuments.some(
      (doc) => !policies.abilities(doc.id).update
    );

    if (hasPermissionIssue) {
      const isPlural = fetchedDocuments.length > 1;
      toast.error(
        isPlural
          ? t("You don't have permission to move these documents")
          : t("You don't have permission to move this document")
      );
      return;
    }

    try {
      const { type, id: parentDocumentId } = selectedPath;
      const collectionId = selectedPath.collectionId as string;

      // Move all documents
      const movePromises = fetchedDocuments.map((document) => {
        if (type === "document") {
          return document.move({ collectionId, parentDocumentId });
        } else {
          return document.move({ collectionId });
        }
      });

      await Promise.all(movePromises);

      const count = fetchedDocuments.length;
      toast.success(
        count === 1
          ? t("Document moved")
          : t("{{count}} documents moved", { count })
      );

      dialogs.closeAllModals();
    } catch (_err) {
      const count = fetchedDocuments.length;
      toast.error(
        count === 1
          ? t("Couldn't move the document, try again?")
          : t("Couldn't move the documents, try again?")
      );
    }
  };

  return (
    <FlexContainer column>
      <DocumentExplorer items={items} onSubmit={move} onSelect={selectPath} />
      <Footer justify="space-between" align="center" gap={8}>
        <StyledText type="secondary">
          {selectedPath ? (
            <Trans
              defaults={
                fetchedDocuments.length === 1
                  ? "Move document to <em>{{ location }}</em>"
                  : "Move {{count}} documents to <em>{{ location }}</em>"
              }
              values={{
                count: fetchedDocuments.length,
                location: selectedPath.title || t("Untitled"),
              }}
              components={{
                em: <strong />,
              }}
            />
          ) : (
            t("Select a location to move")
          )}
        </StyledText>
        <Button disabled={!selectedPath} onClick={move}>
          {t("Move")}
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
