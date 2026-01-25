import { TrashIcon } from "outline-icons";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import { IconButton } from "~/components/IconPicker/components/IconButton";
import Tooltip from "~/components/Tooltip";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import type Emoji from "~/models/Emoji";

const EmojisMenu = ({ emoji }: { emoji: Emoji }) => {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const can = usePolicy(emoji);

  const handleDelete = () => {
    dialogs.openModal({
      title: t("Delete Emoji"),
      content: (
        <DeleteEmojiDialog emoji={emoji} onSubmit={dialogs.closeAllModals} />
      ),
    });
  };

  if (!can.delete) {
    return null;
  }

  return (
    <Tooltip content={t("Delete Emoji")}>
      <IconButton onClick={handleDelete}>
        <TrashIcon />
      </IconButton>
    </Tooltip>
  );
};

const DeleteEmojiDialog = ({
  emoji,
  onSubmit,
}: {
  emoji: Emoji;
  onSubmit: () => void;
}) => {
  const { t } = useTranslation();

  const handleSubmit = async () => {
    if (emoji) {
      await emoji.delete();
      onSubmit();
      toast.success(t("Emoji deleted"));
    }
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
};

export default EmojisMenu;
