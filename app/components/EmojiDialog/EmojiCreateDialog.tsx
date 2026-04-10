import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AttachmentPreset } from "@shared/types";
import { EmojiValidation } from "@shared/validations";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Input, { LabelText } from "~/components/Input";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import { uploadFile } from "~/utils/files";
import { compressImage } from "~/utils/compressImage";
import { generateEmojiNameFromFilename } from "~/utils/emoji";
import { useEmojiFileUpload, EmojiImageDropZone } from "./Components";

interface Props {
  /** Callback invoked after successful creation. */
  onSubmit: () => void;
}

/**
 * Dialog for creating a new custom emoji with image upload and name input.
 */
export function EmojiCreateDialog({ onSubmit }: Props) {
  const { t } = useTranslation();
  const { emojis } = useStores();
  const [name, setName] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);

  const handleFileSelected = React.useCallback((selected: File) => {
    setName((currentName) => {
      if (!currentName.trim()) {
        const generatedName = generateEmojiNameFromFilename(selected.name);
        return generatedName || currentName;
      }
      return currentName;
    });
  }, []);

  const { file, getRootProps, getInputProps, isDragActive } =
    useEmojiFileUpload({ onFileSelected: handleFileSelected });

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
          "Square images with transparent backgrounds work best. If your image is too large, we'll try to resize it for you."
        )}
      </Text>

      <LabelText as="label">{t("Upload an image")}</LabelText>
      <EmojiImageDropZone
        file={file}
        getRootProps={getRootProps}
        getInputProps={getInputProps}
        isDragActive={isDragActive}
      />

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
