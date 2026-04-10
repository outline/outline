import * as React from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import { getDataTransferFiles } from "@shared/utils/files";
import { bytesToHumanReadable } from "@shared/utils/files";
import { AttachmentValidation } from "@shared/validations";
import Text from "~/components/Text";
import { VStack } from "~/components/primitives/VStack";

interface UseEmojiFileUploadOptions {
  /** Optional callback fired after a valid file is selected. */
  onFileSelected?: (file: File) => void;
}

/**
 * Hook that manages emoji image file selection with validation, drag-and-drop,
 * and paste support.
 */
export function useEmojiFileUpload(options?: UseEmojiFileUploadOptions) {
  const { t } = useTranslation();
  const [file, setFile] = React.useState<File | null>(null);

  const handleFileSelection = React.useCallback(
    (selected: File) => {
      const isValidType = AttachmentValidation.emojiContentTypes.includes(
        selected.type
      );

      if (!isValidType) {
        toast.error(
          t("File type not supported. Please use PNG, JPG, GIF, or WebP.")
        );
        return;
      }

      if (selected.size > AttachmentValidation.emojiMaxFileSize) {
        toast.error(
          t("File size too large. Maximum size is {{ size }}.", {
            size: bytesToHumanReadable(AttachmentValidation.emojiMaxFileSize),
          })
        );
        return;
      }

      setFile(selected);
      options?.onFileSelected?.(selected);
    },
    [t, options]
  );

  const handleDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        handleFileSelection(acceptedFiles[0]);
      }
    },
    [handleFileSelection]
  );

  React.useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const files = getDataTransferFiles(event);
      if (files.length > 0) {
        event.preventDefault();
        handleFileSelection(files[0]);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handleFileSelection]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDropAccepted: handleDrop,
    accept: AttachmentValidation.emojiContentTypes,
    maxSize: AttachmentValidation.emojiMaxFileSize,
    maxFiles: 1,
  });

  return { file, getRootProps, getInputProps, isDragActive };
}

interface EmojiImageDropZoneProps {
  /** The currently selected file, if any. */
  file: File | null;
  /** Dropzone root props. */
  getRootProps: ReturnType<typeof useDropzone>["getRootProps"];
  /** Dropzone input props. */
  getInputProps: ReturnType<typeof useDropzone>["getInputProps"];
  /** Whether a drag is currently active. */
  isDragActive: boolean;
}

/**
 * Shared drop zone component for emoji image upload, showing either a file
 * preview or placeholder text.
 */
export function EmojiImageDropZone({
  file,
  getRootProps,
  getInputProps,
  isDragActive,
}: EmojiImageDropZoneProps) {
  const { t } = useTranslation();

  return (
    <DropZone {...getRootProps()}>
      <input {...getInputProps()} />
      <VStack>
        {file ? (
          <>
            <PreviewImage src={URL.createObjectURL(file)} alt="Preview" />
            <Text size="medium">{file.name}</Text>
            <Text size="medium" type="secondary">
              {t("Click or drag to replace")}
            </Text>
          </>
        ) : (
          <>
            <Text size="small">
              {isDragActive
                ? t("Drop the image here")
                : t("Click, drop, or paste an image here")}
            </Text>
            <Text size="small" type="secondary">
              {t("PNG, JPG, GIF, or WebP up to {{ size }}", {
                size: bytesToHumanReadable(
                  AttachmentValidation.emojiMaxFileSize
                ),
              })}
            </Text>
          </>
        )}
      </VStack>
    </DropZone>
  );
}

const DropZone = styled.div`
  border: 2px dashed ${s("inputBorder")};
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: var(--pointer);
  transition: border-color 0.2s;
  margin-bottom: 1em;

  &:hover {
    border-color: ${s("inputBorderFocused")};
  }
`;

const PreviewImage = styled.img`
  width: 64px;
  height: 64px;
  object-fit: contain;
  border-radius: 4px;
`;
