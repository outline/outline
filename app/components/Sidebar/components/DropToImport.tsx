import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import invariant from "invariant";
import { observer } from "mobx-react";
import { useCallback, useSyncExternalStore } from "react";
import Dropzone from "react-dropzone";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled, { css } from "styled-components";
import LoadingIndicator from "~/components/LoadingIndicator";
import useImportDocument from "~/hooks/useImportDocument";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";

type Props = {
  children: React.JSX.Element;
  collectionId?: string;
  documentId?: string;
  disabled?: boolean;
  activeClassName?: string;
};

/**
 * Wraps sidebar content in a dropzone that imports the files dropped on it.
 * The dropzone is only prepared once files are dragged into the window.
 */
function DropToImport(props: Props) {
  const hasDraggedFiles = useSyncExternalStore(
    subscribeToFileDrag,
    getHasDraggedFiles
  );
  invariant(
    props.collectionId || props.documentId,
    "Must provide either collectionId or documentId"
  );

  if (props.disabled || !hasDraggedFiles) {
    return props.children;
  }

  return <ImportDropzone {...props} />;
}

const ImportDropzone = observer(function ImportDropzone({
  children,
  collectionId,
  documentId,
}: Props) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const { handleFiles, isImporting } = useImportDocument(
    collectionId,
    documentId
  );

  const canCollection = usePolicy(collectionId);
  const canDocument = usePolicy(documentId);

  const handleRejection = useCallback(() => {
    toast.error(t("This file type is not supported"));
  }, [t]);

  if (
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
});

let hasDraggedFiles = false;
const fileDragListeners = new Set<() => void>();

// Only prepare dropzones for OS file drags, internal react-dnd drags fire
// native dragenter too.
const handleDragEnter = (event: DragEvent) => {
  if (!Array.from(event.dataTransfer?.types ?? []).includes("Files")) {
    return;
  }
  hasDraggedFiles = true;
  window.removeEventListener("dragenter", handleDragEnter);
  fileDragListeners.forEach((listener) => listener());
};

const subscribeToFileDrag = (listener: () => void) => {
  if (!hasDraggedFiles && !fileDragListeners.size) {
    window.addEventListener("dragenter", handleDragEnter);
  }
  fileDragListeners.add(listener);

  return () => {
    fileDragListeners.delete(listener);
    if (!fileDragListeners.size) {
      window.removeEventListener("dragenter", handleDragEnter);
    }
  };
};

const getHasDraggedFiles = () => hasDraggedFiles;

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

export default DropToImport;
