import * as React from "react";
import { TrashIcon } from "outline-icons";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import type Emoji from "~/models/Emoji";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { createAction } from "~/actions";
import { EmojiSecion } from "~/actions/sections";
import { useMenuAction } from "~/hooks/useMenuAction";

/**
 * Hook that constructs the action menu for emoji management operations.
 * 
 * @param targetEmoji - the emoji to build actions for, or null to skip.
 * @returns action with children for use in menus, or undefined if emoji is null.
 */
export function useEmojiMenuActions(targetEmoji: Emoji | null) {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const can = usePolicy(targetEmoji ?? ({} as Emoji));

  const openDeleteDialog = React.useCallback(() => {
    if (!targetEmoji) {
      return;
    }
    dialogs.openModal({
      title: t("Delete Emoji"),
      content: (
        <DeleteEmojiDialog emoji={targetEmoji} onSubmit={dialogs.closeAllModals} />
      ),
    });
  }, [t, targetEmoji, dialogs]);

  const actionList = React.useMemo(
    () =>
      !targetEmoji || !can.delete
        ? []
        : [
            createAction({
              name: `${t("Delete")}…`,
              icon: <TrashIcon />,
              section: EmojiSecion,
              visible: true,
              dangerous: true,
              perform: openDeleteDialog,
            }),
          ],
    [t, targetEmoji, can.delete, openDeleteDialog]
  );

  return useMenuAction(actionList);
}

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
      submitText={t("I'm sure – Delete")}
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
