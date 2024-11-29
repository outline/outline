import flatten from "lodash/flatten";
import { observer } from "mobx-react";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { NavigationNode } from "@shared/types";
import Document from "~/models/Document";
import { FlexContainer, Footer, StyledText } from "~/scenes/DocumentMove";
import Button from "~/components/Button";
import DocumentExplorer from "~/components/DocumentExplorer";
import useCollectionTrees from "~/hooks/useCollectionTrees";
import useStores from "~/hooks/useStores";
import { flattenTree } from "~/utils/tree";
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
  const [recursive, setRecursive] = React.useState<boolean>(true);
  const [selectedPath, selectPath] = React.useState<NavigationNode | null>(
    null
  );

  const items = React.useMemo(() => {
    const nodes = flatten(collectionTrees.map(flattenTree)).filter((node) =>
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

  const handlePublishChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setPublish(ev.target.checked);
    },
    []
  );

  const handleRecursiveChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setRecursive(ev.target.checked);
    },
    []
  );

  const copy = async () => {
    if (!selectedPath) {
      toast.message(t("Select a location to copy"));
      return;
    }

    try {
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
    } catch (err) {
      toast.error(t("Couldn’t copy the document, try again?"));
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
      <OptionsContainer>
        {!document.isTemplate && (
          <>
            {document.collectionId && (
              <Text size="small">
                <Switch
                  name="publish"
                  label={t("Publish")}
                  labelPosition="right"
                  checked={publish}
                  onChange={handlePublishChange}
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
                  onChange={handleRecursiveChange}
                />
              </Text>
            )}
          </>
        )}
      </OptionsContainer>
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
        <Button disabled={!selectedPath} onClick={copy}>
          {t("Copy")}
        </Button>
      </Footer>
    </FlexContainer>
  );
}

const OptionsContainer = styled.div`
  margin: 16px 0 8px 0;
  padding-left: 24px;
  padding-right: 24px;
`;

export default observer(DocumentCopy);
