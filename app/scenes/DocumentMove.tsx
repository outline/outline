import flatten from "lodash/flatten";
import { observer } from "mobx-react";
import * as React from "react";
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
import { flattenTree } from "~/utils/tree";

type Props = {
  document: Document;
};

function DocumentMove({ document }: Props) {
  const { dialogs, policies } = useStores();
  const { t } = useTranslation();
  const collectionTrees = useCollectionTrees();
  const [selectedPath, selectPath] = React.useState<NavigationNode | null>(
    null
  );

  const items = React.useMemo(() => {
    // Recursively filter out the document itself and its existing parent doc, if any.
    const filterSourceDocument = (node: NavigationNode): NavigationNode => ({
      ...node,
      children: node.children
        ?.filter(
          (c) => c.id !== document.id && c.id !== document.parentDocumentId
        )
        .map(filterSourceDocument),
    });

    // Filter out the document itself and its existing parent doc, if any.
    const nodes = flatten(collectionTrees.map(flattenTree))
      .filter(
        (node) =>
          node.id !== document.id && node.id !== document.parentDocumentId
      )
      .map(filterSourceDocument)
      // Filter out collections that we don't have permission to create documents in.
      .filter((node) =>
        node.collectionId
          ? policies.get(node.collectionId)?.abilities.createDocument
          : true
      );

    // If the document we're moving is a template, only show collections as
    // move targets.
    if (document.isTemplate) {
      return nodes
        .filter((node) => node.type === "collection")
        .map((node) => ({ ...node, children: [] }));
    }
    return nodes;
  }, [
    policies,
    collectionTrees,
    document.id,
    document.parentDocumentId,
    document.isTemplate,
  ]);

  const move = async () => {
    if (!selectedPath) {
      toast.message(t("Select a location to move"));
      return;
    }

    try {
      const { type, id: parentDocumentId } = selectedPath;

      const collectionId = selectedPath.collectionId as string;

      if (type === "document") {
        await document.move({ collectionId, parentDocumentId });
      } else {
        await document.move({ collectionId });
      }

      toast.success(t("Document moved"));

      dialogs.closeAllModals();
    } catch (err) {
      toast.error(t("Couldn’t move the document, try again?"));
    }
  };

  return (
    <FlexContainer column>
      <DocumentExplorer items={items} onSubmit={move} onSelect={selectPath} />
      <Footer justify="space-between" align="center" gap={8}>
        <StyledText type="secondary">
          {selectedPath ? (
            <Trans
              defaults="Move to <em>{{ location }}</em>"
              values={{
                location: selectedPath.title,
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
