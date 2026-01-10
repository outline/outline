import { observer } from "mobx-react";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import type { NavigationNode } from "@shared/types";
import type Document from "~/models/Document";
import { FlexContainer, Footer, StyledText } from "~/scenes/DocumentMove";
import Button from "~/components/Button";
import DocumentExplorer from "~/components/DocumentExplorer";
import useCollectionTrees from "~/hooks/useCollectionTrees";
import useStores from "~/hooks/useStores";
import Switch from "./Switch";
import Text from "./Text";

type Props = {
  /** The original document to duplicate */
  document: Document;
  onSubmit: (documents: Document[]) => void;
};

function DocumentCopy({ document, onSubmit }: Props) {
  const { t } = useTranslation();
  const { policies } = useStores();
  const collectionTrees = useCollectionTrees();
  const [publish, setPublish] = React.useState<boolean>(!!document.publishedAt);
  const [copying, setCopying] = React.useState<boolean>(false);
  const [recursive, setRecursive] = React.useState<boolean>(true);
  const [selectedPath, selectPath] = React.useState<NavigationNode | null>(
    null
  );

  const items = React.useMemo(() => {
    const nodes = collectionTrees.filter((node) =>
      node.collectionId
        ? policies.get(node.collectionId)?.abilities.createDocument
        : true
    );

    if (document.isTemplate) {
      return nodes
        .filter((node) => node.type === "collection")
        .map((node) => ({ ...node, children: [] }));
    }
    return nodes;
  }, [policies, collectionTrees, document.isTemplate]);

  const copy = async () => {
    if (!selectedPath) {
      toast.message(t("Select a location to copy"));
      return;
    }

    try {
      setCopying(true);
      const result = await document.duplicate({
        publish,
        recursive,
        title: document.title,
        collectionId: selectedPath.collectionId,
        ...(selectedPath.type === "document"
          ? { parentDocumentId: selectedPath.id }
          : {}),
      });

      toast.success(t("Document copied"));
      onSubmit(result);
    } catch (_err) {
      toast.error(t("Couldn’t copy the document, try again?"));
    } finally {
      setCopying(false);
    }
  };

  return (
    <FlexContainer column>
      <DocumentExplorer
        items={items}
        onSubmit={copy}
        onSelect={selectPath}
        defaultValue={document.parentDocumentId || document.collectionId || ""}
      />
      {!document.isTemplate && (
        <OptionsContainer>
          {document.collectionId && (
            <Text size="small">
              <Switch
                name="publish"
                label={t("Publish")}
                labelPosition="right"
                checked={publish}
                onChange={setPublish}
              />
            </Text>
          )}
          {document.publishedAt && document.childDocuments.length > 0 && (
            <Text size="small">
              <Switch
                name="recursive"
                label={t("Include nested documents")}
                labelPosition="right"
                checked={recursive}
                onChange={setRecursive}
              />
            </Text>
          )}
        </OptionsContainer>
      )}
      <Footer justify="space-between" align="center" gap={8}>
        <StyledText type="secondary">
          {selectedPath ? (
            <Trans
              defaults="Copy to <em>{{ location }}</em>"
              values={{ location: selectedPath.title }}
              components={{ em: <strong /> }}
            />
          ) : (
            t("Select a location to copy")
          )}
        </StyledText>
        <Button disabled={!selectedPath || copying} onClick={copy}>
          {copying ? `${t("Copying")}…` : t("Copy")}
        </Button>
      </Footer>
    </FlexContainer>
  );
}

const OptionsContainer = styled.div`
  border-top: 1px solid ${(props) => props.theme.horizontalRule};
  padding: 16px 24px 0;
  margin-bottom: -1px;
  background: ${(props) => props.theme.modalBackground};
  z-index: 1;
`;

export default observer(DocumentCopy);
