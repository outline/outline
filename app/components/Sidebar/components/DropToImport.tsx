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
import useImportNote from "~/hooks/useImportNote";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
type Props = {
  children: JSX.Element;
  notebookId?: string;
  noteId?: string;
  disabled?: boolean;
  activeClassName?: string;
};
function DropToImport({ disabled, children, notebookId, noteId }: Props) {
  const { t } = useTranslation();
  const { notes } = useStores();
  const [prerender, setPreRendered] = useState(false);
  const { handleFiles, isImporting } = useImportNote(notebookId, noteId);
  invariant(notebookId || noteId, "Must provide either collectionId or noteId");
  // Only prepare the dropzone for OS file drags, internal react-dnd drags
  // fire native dragenter too
  useEventListener("dragenter", (event: Event) => {
    if (
      typeof DragEvent !== "undefined" &&
      event instanceof DragEvent &&
      Array.from(event.dataTransfer?.types ?? []).includes("Files")
    ) {
      setPreRendered(true);
    }
  });
  const canNotebook = usePolicy(notebookId);
  const canNote = usePolicy(noteId);
  const handleRejection = useCallback(() => {
    toast.error(t("This file type is not supported"));
  }, [t]);
  if (
    disabled ||
    !prerender ||
    (notebookId && !canNotebook.createNote) ||
    (noteId && !canNote.createChildNote)
  ) {
    return children;
  }
  return (
    <Dropzone
      accept={notes.importFileTypesString}
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
const DropzoneContainer = styled.div<{
  $isDragActive: boolean;
}>`
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
