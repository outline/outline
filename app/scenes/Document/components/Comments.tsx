import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useRouteMatch } from "react-router-dom";
import Avatar from "~/components/Avatar";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import Sidebar from "./RightSidebar";

function Comments() {
  const { ui, comments, documents } = useStores();
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const match = useRouteMatch<{ documentSlug: string }>();
  const document = documents.getByUrl(match.params.documentSlug);

  const handleCreateComment = (commentId: string) => (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const comment = comments.get(commentId);
    if (comment) {
      comment.save({
        data: {
          text: event.target.text.value,
        },
      });
    }
    console.log(event);
  };

  const handleCreateReply = (parentCommentId: string) => (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    comments.save({
      parentCommentId,
      documentId: document?.id,
      data: {
        text: event.target.text.value,
      },
    });
    console.log(event);
  };

  if (!team.commenting || !document) {
    return null;
  }

  return (
    <Sidebar title={t("Comments")} onClose={ui.collapseComments}>
      {comments.threadsInDocument(document.id).map((thread) => {
        return (
          <>
            {comments.inThread(thread.id).map((comment) => (
              <Flex gap={8}>
                <Avatar src={user.avatarUrl} />
                {comment.data.text}
              </Flex>
            ))}
            <form
              onSubmit={
                thread.isNew
                  ? handleCreateComment(thread.id)
                  : handleCreateReply(thread.id)
              }
            >
              <Flex gap={8}>
                <Avatar src={user.avatarUrl} />
                <Input
                  name="text"
                  autoFocus={thread.isNew}
                  placeholder={
                    thread.isNew ? `${t("Add a comment")}…` : `${t("Reply")}…`
                  }
                />
                <Button type="submit" aria-label={t("Comment")}>
                  ⬆
                </Button>
              </Flex>
            </form>
          </>
        );
      })}
    </Sidebar>
  );
}

export default observer(Comments);
