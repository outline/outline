import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { DocumentValidation } from "@shared/validations";
import Document from "~/models/Document";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Input from "./Input";
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
  const [recursive, setRecursive] = React.useState<boolean>(true);
  const [title, setTitle] = React.useState<string>(defaultTitle);

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
      {document.publishedAt && !document.isTemplate && (
        <label>
          <Text size="small">
            <input
              type="checkbox"
              name="recursive"
              checked={recursive}
              onChange={handleRecursiveChange}
            />{" "}
            {t("Include nested documents")}
          </Text>
        </label>
      )}
    </ConfirmationDialog>
  );
}

export default observer(DuplicateDialog);
