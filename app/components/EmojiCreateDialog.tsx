import * as React from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import { AttachmentPreset } from "@shared/types";
import { getDataTransferFiles } from "@shared/utils/files";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Input, { LabelText } from "~/components/Input";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import { uploadFile } from "~/utils/files";
import { compressImage } from "~/utils/compressImage";
import { generateEmojiNameFromFilename } from "~/utils/emoji";
import { AttachmentValidation, EmojiValidation } from "@shared/validations";
import { bytesToHumanReadable } from "@shared/utils/files";
import { VStack } from "./primitives/VStack";

type Props = {
  onSubmit: () => void;
};

export function EmojiCreateDialog({ onSubmit }: Props) {
  const { t } = useTranslation();
  const { emojis } = useStores();
  const [name, setName] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const handleFileSelection = React.useCallback(
    (file: File) => {
      const isValidType = AttachmentValidation.emojiContentTypes.includes(
        file.type
      );

      if (!isValidType) {
        toast.error(
          t("File type not supported. Please use PNG, JPG, GIF, or WebP.")
        );
        return;
      }

      // Validate file size
      if (file.size > AttachmentValidation.emojiMaxFileSize) {
        toast.error(
          t("File size too large. Maximum size is {{ size }}.", {
            size: bytesToHumanReadable(AttachmentValidation.emojiMaxFileSize),
          })
        );
        return;
      }

      setFile(file);

      // Auto-populate name field if it's empty
      setName((currentName) => {
        if (!currentName.trim()) {
          const generatedName = generateEmojiNameFromFilename(file.name);
          return generatedName || currentName;
        }
        return currentName;
      });
    },
    [t]
  );

  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        handleFileSelection(acceptedFiles[0]);
      }
    },
    [handleFileSelection]
  );

  // Handle paste events
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
    onDropAccepted: onDrop,
    accept: AttachmentValidation.emojiContentTypes,
    maxSize: AttachmentValidation.emojiMaxFileSize,
    maxFiles: 1,
  });

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t("Please enter a name for the emoji"));
      return;
    }

    if (!file) {
      toast.error(t("Please select an image file"));
      return;
    }

    setIsUploading(true);
    try {
      // Skip compression for GIFs to preserve animation
      const fileToUpload =
        file.type === "image/gif"
          ? file
          : await compressImage(file, {
              maxHeight: 64,
              maxWidth: 64,
            });

      const attachment = await uploadFile(fileToUpload, {
        name: file.name,
        preset: AttachmentPreset.Emoji,
      });

      await emojis.create({
        name: name.trim(),
        attachmentId: attachment.id,
      });

      toast.success(t("Emoji created successfully"));
      onSubmit();
    } finally {
      setIsUploading(false);
    }
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setName(value);
  };

  const isValidName = EmojiValidation.allowedNameCharacters.test(name);
  const isValid = name.trim().length > 0 && file && isValidName;

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      disabled={!isValid || isUploading}
      savingText={isUploading ? `${t("Uploading")}…` : undefined}
      submitText={t("Add emoji")}
    >
      <Text as="p" type="secondary">
        {t(
          "Square images with transparent backgrounds work best. If your image is too large, we’ll try to resize it for you."
        )}
      </Text>

      <LabelText as="label">{t("Upload an image")}</LabelText>
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
              <Text size="medium">
                {isDragActive
                  ? t("Drop the image here")
                  : t("Click, drop, or paste an image here")}
              </Text>
              <Text size="medium" type="secondary">
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

      <Input
        label={t("Choose a name")}
        value={name}
        onChange={handleNameChange}
        placeholder="my_custom_emoji"
        autoFocus
        required
        error={
          !isValidName
            ? t(
                "name can only contain lowercase letters, numbers, and underscores."
              )
            : undefined
        }
      />

      {name.trim() && isValidName && (
        <Text type="secondary" style={{ marginTop: "8px" }}>
          {t("This emoji will be available as")} <code>:{name}:</code>
        </Text>
      )}
    </ConfirmationDialog>
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
