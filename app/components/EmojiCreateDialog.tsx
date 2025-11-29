import * as React from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import { AttachmentPreset } from "@shared/types";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import { uploadFile } from "~/utils/files";
import { compressImage } from "~/utils/compressImage";
import Logger from "~/utils/Logger";
import { AttachmentValidation, EmojiValidation } from "@shared/validations";

type Props = {
  onSubmit: () => void;
};

export function EmojiCreateDialog({ onSubmit }: Props) {
  const { t } = useTranslation();
  const { emojis } = useStores();
  const [name, setName] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDropAccepted: onDrop,
    accept: AttachmentValidation.emojiContentTypes,
    maxFiles: 1,
    maxSize: 1024 * 1024, // 1MB
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
      const compressed = await compressImage(file, {
        maxHeight: 64,
        maxWidth: 64,
      });

      const attachment = await uploadFile(compressed, {
        name: file.name,
        preset: AttachmentPreset.DocumentAttachment,
      });

      const emoji = await emojis.create({
        name: name.trim(),
        attachmentId: attachment.id,
      });

      emojis.add(emoji);
      toast.success(t("Emoji created successfully"));
      onSubmit();
    } catch (error) {
      toast.error(t("Failed to create emoji"));
      Logger.error("Failed to create emoji", error);
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
          "Upload an image to create a custom emoji. The name should be unique and contain only lowercase letters, numbers, and underscores."
        )}
      </Text>

      <Input
        label={t("Emoji name")}
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

      <DropZone {...getRootProps()}>
        <input {...getInputProps()} />
        <Flex column align="center" gap={8}>
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
                  : t("Click or drag an image here")}
              </Text>
              <Text size="medium" type="secondary">
                {t("PNG, JPG, GIF, or WebP up to 1MB")}
              </Text>
            </>
          )}
        </Flex>
      </DropZone>

      {name.trim() && isValidName && (
        <div style={{ marginTop: "8px" }}>
          <Text type="secondary">
            {t("This emoji will be available as")} <code>:{name}:</code>
          </Text>
        </div>
      )}
    </ConfirmationDialog>
  );
}

const DropZone = styled.div`
  border: 2px dashed ${s("divider")};
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s;

  &:hover {
    border-color: ${s("accent")};
  }
`;

const PreviewImage = styled.img`
  width: 64px;
  height: 64px;
  object-fit: contain;
  border-radius: 4px;
`;
