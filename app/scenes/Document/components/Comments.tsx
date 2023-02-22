import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useRouteMatch } from "react-router-dom";
import styled from "styled-components";
import Comment from "~/models/Comment";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import useCurrentUser from "~/hooks/useCurrentUser";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import CommentForm from "./CommentForm";
import CommentThread from "./CommentThread";
import Sidebar from "./SidebarLayout";

function useFocusedComment() {
  const { comments } = useStores();
  const location = useLocation<{ commentId?: string }>();
  const query = useQuery();
  const focusedCommentId = location.state?.commentId || query.get("commentId");
  return focusedCommentId ? comments.get(focusedCommentId) : undefined;
}

function Comments() {
  const { ui, comments, documents } = useStores();
  const [newComment] = React.useState(new Comment({}, comments));
  const { t } = useTranslation();
  const user = useCurrentUser();
  const match = useRouteMatch<{ documentSlug: string }>();
  const document = documents.getByUrl(match.params.documentSlug);
  const focusedComment = useFocusedComment();

  if (!document) {
    return null;
  }

  return (
    <Sidebar title={t("Comments")} onClose={ui.collapseComments}>
      <Wrapper>
        {comments
          .threadsInDocument(document.id)
          .filter((thread) => !thread.isNew || thread.createdById === user.id)
          .map((thread) => (
            <CommentThread
              key={thread.id}
              comment={thread}
              document={document}
              recessed={!!focusedComment && focusedComment.id !== thread.id}
              focused={focusedComment?.id === thread.id}
            />
          ))}
        <Flex />

        {!focusedComment && (
          <Fade>
            <NewCommentForm
              documentId={document.id}
              thread={newComment}
              placeholder={`${t("Add a comment")}…`}
              autoFocus={false}
              standalone
            />
          </Fade>
        )}
      </Wrapper>
    </Sidebar>
  );
}

const Wrapper = styled.div`
  padding-bottom: 50vh;
`;

const NewCommentForm = styled(CommentForm)`
  background: ${(props) => props.theme.background};
  position: absolute;
  padding: 12px 18px 12px 12px;
  left: 0;
  right: 0;
  bottom: 0;
`;

export default observer(Comments);
