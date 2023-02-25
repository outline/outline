import { AnimatePresence } from "framer-motion";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useRouteMatch } from "react-router-dom";
import styled from "styled-components";
import Comment from "~/models/Comment";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import useCurrentUser from "~/hooks/useCurrentUser";
import useFocusedComment from "~/hooks/useFocusedComment";
import useStores from "~/hooks/useStores";
import CommentForm from "./CommentForm";
import CommentThread from "./CommentThread";
import Sidebar from "./SidebarLayout";

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

  const threads = comments
    .threadsInDocument(document.id)
    .filter((thread) => !thread.isNew || thread.createdById === user.id);
  const hasComments = threads.length > 0;

  return (
    <Sidebar title={t("Comments")} onClose={ui.collapseComments}>
      <Wrapper $hasComments={hasComments}>
        {hasComments ? (
          threads.map((thread) => (
            <CommentThread
              key={thread.id}
              comment={thread}
              document={document}
              recessed={!!focusedComment && focusedComment.id !== thread.id}
              focused={focusedComment?.id === thread.id}
            />
          ))
        ) : (
          <NoComments align="center" justify="center" auto>
            <Empty>{t("No comments yet")}</Empty>
          </NoComments>
        )}

        <AnimatePresence initial={false}>
          {!focusedComment && (
            <NewCommentForm
              key="new-comment-form"
              documentId={document.id}
              thread={newComment}
              placeholder={`${t("Add a comment")}…`}
              autoFocus={false}
              dir={document.dir}
              animatePresence
              standalone
            />
          )}
        </AnimatePresence>
      </Wrapper>
    </Sidebar>
  );
}

const NoComments = styled(Flex)`
  padding-bottom: 65px;
  height: 100%;
`;

const Wrapper = styled.div<{ $hasComments: boolean }>`
  padding-bottom: ${(props) => (props.$hasComments ? "50vh" : "0")};
  height: ${(props) => (props.$hasComments ? "auto" : "100%")};
`;

const NewCommentForm = styled(CommentForm)<{ dir?: "ltr" | "rtl" }>`
  background: ${(props) => props.theme.background};
  position: absolute;
  padding: 12px;
  padding-right: ${(props) => (props.dir !== "rtl" ? "18px" : "12px")};
  padding-left: ${(props) => (props.dir === "rtl" ? "18px" : "12px")};
  left: 0;
  right: 0;
  bottom: 0;
`;

export default observer(Comments);
