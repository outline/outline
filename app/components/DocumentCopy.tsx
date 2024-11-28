import flatten from "lodash/flatten";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { NavigationNode } from "@shared/types";
import { DocumentValidation } from "@shared/validations";
import Document from "~/models/Document";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import DocumentExplorer from "~/components/DocumentExplorer";
import useCollectionTrees from "~/hooks/useCollectionTrees";
import useStores from "~/hooks/useStores";
import { flattenTree } from "~/utils/tree";
import Input, { LabelText } from "./Input";
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
  const defaultTitle = t(`Copy of {{ documentName }}`, {
    documentName: document.title,
  });
  const [publish, setPublish] = React.useState<boolean>(!!document.publishedAt);
  const [recursive, setRecursive] = React.useState<boolean>(true);
  const [title, setTitle] = React.useState<string>(defaultTitle);
  const [path, selectPath] = React.useState<NavigationNode | null>(null);

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

  const noOp = () => {};

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

  const handleTitleChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(ev.target.value);
    },
    []
  );

  const handleSubmit = async () => {
    if (path) {
      const result = await document.duplicate({
        publish,
        recursive,
        title,
        collectionId: path.collectionId,
        ...(path.type === "document" ? { parentDocumentId: path.id } : {}),
      });
      onSubmit(result);
    }
  };

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("Duplicate")}
      disabled={!path}
    >
      <LabelText>{t("Destination")}</LabelText>
      <DocumentExplorer
        items={items}
        onSubmit={noOp}
        onSelect={selectPath}
        initialSelectionId={
          document.parentDocumentId || document.collectionId || ""
        }
      />
      <Input
        autoFocus
        autoSelect
        name="title"
        label={t("Title")}
        onChange={handleTitleChange}
        maxLength={DocumentValidation.maxTitleLength}
        defaultValue={defaultTitle}
      />
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
    </ConfirmationDialog>
  );
}

export default observer(DocumentCopy);
