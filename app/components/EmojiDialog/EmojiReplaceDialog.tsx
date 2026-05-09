import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AttachmentPreset } from "@shared/types";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Text from "~/components/Text";
import type Emoji from "~/models/Emoji";
import useStores from "~/hooks/useStores";
import { uploadFile } from "~/utils/files";
import { compressImage } from "~/utils/compressImage";
import { useEmojiFileUpload, EmojiImageDropZone } from "./Components";

interface Props {
  /** The emoji whose image is being replaced. */
  emoji: Emoji;
  /** Callback invoked after a successful replacement. */
  onSubmit: () => void;
}

/**
 * Dialog for replacing the image of an existing custom emoji.
 */
export function EmojiReplaceDialog({ emoji, onSubmit }: Props) {
  const { t } = useTranslation();
  const { emojis } = useStores();
  const [isUploading, setIsUploading] = React.useState(false);
  const { file, getRootProps, getInputProps, isDragActive } =
    useEmojiFileUpload();

  const handleSubmit = async () => {
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

      await emojis.update({
        id: emoji.id,
        attachmentId: attachment.id,
      });

      toast.success(t("Emoji replaced"));
      onSubmit();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      disabled={!file || isUploading}
      savingText={isUploading ? `${t("Uploading")}…` : undefined}
      submitText={t("Save")}
    >
      <Text as="p" type="secondary">
        <Trans
          defaults="Upload a new image to replace the current one for <em>{{emojiName}}</em>. All existing uses of this emoji will be updated automatically."
          values={{ emojiName: `:${emoji.name}:` }}
          components={{ em: <code /> }}
        />
      </Text>

      <EmojiImageDropZone
        file={file}
        getRootProps={getRootProps}
        getInputProps={getInputProps}
        isDragActive={isDragActive}
      />
    </ConfirmationDialog>
  );
}
