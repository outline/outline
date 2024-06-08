import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { DocumentValidation } from "@shared/validations";
import Document from "~/models/Document";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Input from "./Input";
import Switch from "./Switch";
import Text from "./Text";

type Props = {
  /** The original document to duplicate */
  document: Document;
  onSubmit: (documents: Document[]) => void;
};

function DuplicateDialog({ document, onSubmit }: Props) {
  const { t } = useTranslation();
  const defaultTitle = t(`Copy of {{ documentName }}`, {
    documentName: document.title,
  });
  const [publish, setPublish] = React.useState<boolean>(!!document.publishedAt);
  const [recursive, setRecursive] = React.useState<boolean>(true);
  const [title, setTitle] = React.useState<string>(defaultTitle);

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
    const result = await document.duplicate({
      publish,
      recursive,
      title,
    });
    onSubmit(result);
  };

  return (
    <ConfirmationDialog onSubmit={handleSubmit} submitText={t("Duplicate")}>
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
                label={t("Published")}
                labelPosition="right"
                checked={publish}
                onChange={handlePublishChange}
              />
            </Text>
          )}
          {document.publishedAt && (
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

export default observer(DuplicateDialog);
