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

type Props = {
  onSubmit: () => void;
};

export function EmojiUploadDialog({ onSubmit }: Props) {
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
    onDrop,
    accept: [".png", ".jpg", ".jpeg", ".gif", ".webp"],
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
      const attachment = await uploadFile(file, {
        name: file.name,
        preset: AttachmentPreset.Avatar,
      });

      await emojis.create({
        name: name.trim(),
        url: attachment.url,
      });

      toast.success(t("Emoji created successfully"));
      onSubmit();
    } catch (error) {
      toast.error(t("Failed to create emoji"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Remove special characters and spaces, convert to lowercase
    const value = event.target.value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 32);
    setName(value);
  };

  const isValid = name.trim().length > 0 && file;

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
      />

      <DropZone {...getRootProps()}>
        <input {...getInputProps()} />
        <Flex column align="center" gap={8}>
          {file ? (
            <>
              <PreviewImage src={URL.createObjectURL(file)} alt="Preview" />
              <Text>{file.name}</Text>
              <Text type="secondary">{t("Click or drag to replace")}</Text>
            </>
          ) : (
            <>
              <Text>
                {isDragActive
                  ? t("Drop the image here")
                  : t("Click or drag an image here")}
              </Text>
              <Text type="secondary">
                {t("PNG, JPG, GIF, or WebP up to 1MB")}
              </Text>
            </>
          )}
        </Flex>
      </DropZone>

      {name && (
        <Text type="secondary">
          {t("This emoji will be available as")} <code>:{name}:</code>
        </Text>
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
