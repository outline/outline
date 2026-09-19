import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import type Emoji from "~/models/Emoji";

interface Props {
  /** The emoji being deleted. */
  emoji: Emoji;
  /** Callback invoked after a successful deletion. */
  onSubmit: () => void;
}

/**
 * Dialog confirming deletion of an existing custom emoji.
 */
export function EmojiDeleteDialog({ emoji, onSubmit }: Props) {
  const { t } = useTranslation();

  const handleSubmit = async () => {
    await emoji.delete();
    onSubmit();
    toast.success(t("Emoji deleted"));
  };

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("I’m sure – Delete")}
      savingText={`${t("Deleting")}…`}
      danger
    >
      <Trans
        defaults="Are you sure you want to delete the <em>{{emojiName}}</em> emoji? You will no longer be able to use it in your documents or collections."
        values={{
          emojiName: emoji.name,
        }}
        components={{
          em: <strong />,
        }}
      />
    </ConfirmationDialog>
  );
}
