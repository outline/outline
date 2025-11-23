import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import invariant from "invariant";
import { observer } from "mobx-react";
import { useCallback, useState } from "react";
import Dropzone from "react-dropzone";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled, { css } from "styled-components";
import LoadingIndicator from "~/components/LoadingIndicator";
import useEventListener from "~/hooks/useEventListener";
import useImportDocument from "~/hooks/useImportDocument";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";

type Props = {
  children: JSX.Element;
  collectionId?: string;
  documentId?: string;
  disabled?: boolean;
  activeClassName?: string;
};

function DropToImport({ disabled, children, collectionId, documentId }: Props) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const [prerender, setPreRendered] = useState(false);
  const { handleFiles, isImporting } = useImportDocument(
    collectionId,
    documentId
  );
  invariant(
    collectionId || documentId,
    "Must provide either collectionId or documentId"
  );
  useEventListener("dragenter", () => setPreRendered(true));

  const canCollection = usePolicy(collectionId);
  const canDocument = usePolicy(documentId);

  const handleRejection = useCallback(() => {
    toast.error(
      t("Document not supported – try Markdown, Plain text, HTML, or Word")
    );
  }, [t]);

  if (
    disabled ||
    !prerender ||
    (collectionId && !canCollection.createDocument) ||
    (documentId && !canDocument.createChildDocument)
  ) {
    return children;
  }

  return (
    <Dropzone
      accept={documents.importFileTypesString}
      onDropAccepted={handleFiles}
      onDropRejected={handleRejection}
      noClick
      multiple
    >
      {({ getRootProps, getInputProps, isDragActive }) => (
        <DropzoneContainer
          {...getRootProps()}
          $isDragActive={isDragActive}
          tabIndex={-1}
        >
          <VisuallyHidden>
            <label>
              {t("Import files")}
              <input {...getInputProps()} />
            </label>
          </VisuallyHidden>
          {isImporting && <LoadingIndicator />}
          {children}
        </DropzoneContainer>
      )}
    </Dropzone>
  );
}

const DropzoneContainer = styled.div<{ $isDragActive: boolean }>`
  border-radius: 4px;

  ${({ $isDragActive, theme }) =>
    $isDragActive &&
    css`
      a,
      a + * {
        background: ${theme.slateDark} !important;
        color: ${theme.white} !important;
      }
      svg {
        fill: ${theme.white};
      }
    `}
`;

export default observer(DropToImport);
