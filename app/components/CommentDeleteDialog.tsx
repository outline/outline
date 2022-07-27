import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import Comment from "~/models/Comment";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Text from "~/components/Text";
import useToasts from "~/hooks/useToasts";

type Props = {
  comment: Comment;
  onSubmit?: () => void;
};

function CommentDeleteDialog({ comment, onSubmit }: Props) {
  const { showToast } = useToasts();
  const { t } = useTranslation();

  const handleSubmit = async () => {
    try {
      await comment.delete();
      onSubmit?.();
    } catch (err) {
      showToast(err.message, { type: "error" });
    }
  };

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("I’m sure – Delete")}
      savingText={`${t("Deleting")}…`}
      danger
    >
      <Text type="secondary">
        <Trans>Are you sure you want to permanently delete this comment?</Trans>
      </Text>
    </ConfirmationDialog>
  );
}

export default observer(CommentDeleteDialog);
