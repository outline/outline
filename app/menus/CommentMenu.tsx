import copy from "copy-to-clipboard";
import { observer } from "mobx-react";
import { CopyIcon, EditIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import { toast } from "sonner";
import EventBoundary from "@shared/components/EventBoundary";
import Comment from "~/models/Comment";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Template from "~/components/ContextMenu/Template";
import { actionToMenuItem } from "~/actions";
import {
  deleteCommentFactory,
  resolveCommentFactory,
  unresolveCommentFactory,
  viewCommentReactionsFactory,
} from "~/actions/definitions/comments";
import useActionContext from "~/hooks/useActionContext";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { ReactionData } from "~/types";
import { commentPath, urlify } from "~/utils/routeHelpers";

type Props = {
  /** The comment to associate with the menu */
  comment: Comment;
  /** CSS class name */
  className?: string;
  /** Callback when the "Edit" is selected in the menu */
  onEdit: () => void;
  /** Callback when the comment has been deleted */
  onDelete: () => void;
  /** Callback when the comment has been updated */
  onUpdate: (attrs: { resolved: boolean }) => void;
};

function CommentMenu({
  comment,
  onEdit,
  onDelete,
  onUpdate,
  className,
}: Props) {
  const menu = useMenuState({
    modal: true,
  });
  const { documents } = useStores();
  const { t } = useTranslation();
  const can = usePolicy(comment);
  const context = useActionContext({ isContextMenu: true });
  const document = documents.get(comment.documentId);

  const handleCopyLink = React.useCallback(() => {
    if (document) {
      copy(urlify(commentPath(document, comment)));
      toast.message(t("Link copied"));
    }
  }, [t, document, comment]);

  const fetchReactionData = React.useCallback(async () => {
    const allReactions = await comment.fetchReactions();
    return allReactions.map(
      // @ts-expect-error reaction data from server
      (reaction) =>
        ({
          emoji: reaction.emoji,
          user: {
            id: reaction.user.id,
            name: reaction.user.name,
            initial: reaction.user.name
              ? reaction.user.name[0].toUpperCase()
              : "?",
            color: reaction.user.color,
            avatarUrl: reaction.user.avatarUrl,
          },
        } as ReactionData)
    ) as ReactionData[];
  }, [comment]);

  return (
    <>
      <EventBoundary>
        <OverflowMenuButton
          aria-label={t("Show menu")}
          className={className}
          {...menu}
        />
      </EventBoundary>
      <ContextMenu {...menu} aria-label={t("Comment options")}>
        <Template
          {...menu}
          items={[
            {
              type: "button",
              title: `${t("Edit")}…`,
              icon: <EditIcon />,
              onClick: onEdit,
              visible: can.update,
            },
            actionToMenuItem(
              resolveCommentFactory({
                comment,
                onResolve: () => onUpdate({ resolved: true }),
              }),
              context
            ),
            actionToMenuItem(
              unresolveCommentFactory({
                comment,
                onUnresolve: () => onUpdate({ resolved: false }),
              }),
              context
            ),
            actionToMenuItem(
              viewCommentReactionsFactory({
                comment,
                fetchReactionData,
              }),
              context
            ),
            {
              type: "button",
              icon: <CopyIcon />,
              title: t("Copy link"),
              onClick: handleCopyLink,
            },
            {
              type: "separator",
            },
            actionToMenuItem(
              deleteCommentFactory({ comment, onDelete }),
              context
            ),
          ]}
        />
      </ContextMenu>
    </>
  );
}

export default observer(CommentMenu);
