import { AnimatePresence } from "framer-motion";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useRouteMatch } from "react-router-dom";
import styled from "styled-components";
import { ProsemirrorData, UserPreference } from "@shared/types";
import { useDocumentContext } from "~/components/DocumentContext";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Scrollable from "~/components/Scrollable";
import useCurrentUser from "~/hooks/useCurrentUser";
import useFocusedComment from "~/hooks/useFocusedComment";
import useKeyDown from "~/hooks/useKeyDown";
import usePersistedState from "~/hooks/usePersistedState";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { CommentSortOption, CommentSortType } from "~/types";
import CommentForm from "./CommentForm";
import CommentSortMenu from "./CommentSortMenu";
import CommentThread from "./CommentThread";
import Sidebar from "./SidebarLayout";

function Comments() {
  const { ui, comments, documents } = useStores();
  const user = useCurrentUser();
  const { editor, isEditorInitialized } = useDocumentContext();
  const { t } = useTranslation();
  const match = useRouteMatch<{ documentSlug: string }>();
  const params = useQuery();
  const document = documents.getByUrl(match.params.documentSlug);
  const focusedComment = useFocusedComment();
  const can = usePolicy(document);

  useKeyDown("Escape", () => document && ui.collapseComments(document?.id));

  const [draft, onSaveDraft] = usePersistedState<ProsemirrorData | undefined>(
    `draft-${document?.id}-new`,
    undefined
  );

  const sortOption: CommentSortOption = user.getPreference(
    UserPreference.SortCommentsByOrderInDocument
  )
    ? {
        type: CommentSortType.OrderInDocument,
        referencedCommentIds: editor?.getComments().map((c) => c.id) ?? [],
      }
    : { type: CommentSortType.MostRecent };

  const viewingResolved = params.get("resolved") === "";
  const resolvedThreads = document
    ? comments.resolvedThreadsInDocument(document.id, sortOption)
    : [];

  if (!document || !isEditorInitialized) {
    return null;
  }

  const threads = viewingResolved
    ? resolvedThreads
    : comments.unresolvedThreadsInDocument(document.id, sortOption);
  const hasComments = threads.length > 0;

  return (
    <Sidebar
      title={
        <Flex align="center" justify="space-between" auto>
          <span>{t("Comments")}</span>
          <CommentSortMenu />
        </Flex>
      }
      onClose={() => ui.collapseComments(document?.id)}
      scrollable={false}
    >
      <Scrollable
        id="comments"
        bottomShadow={!focusedComment}
        hiddenScrollbars
        topShadow
      >
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
              <PositionedEmpty>
                {viewingResolved
                  ? t("No resolved comments")
                  : t("No comments yet")}
              </PositionedEmpty>
            </NoComments>
          )}
        </Wrapper>
      </Scrollable>
      <AnimatePresence initial={false}>
        {!focusedComment && can.comment && !viewingResolved && (
          <NewCommentForm
            draft={draft}
            onSaveDraft={onSaveDraft}
            documentId={document.id}
            placeholder={`${t("Add a comment")}…`}
            autoFocus={false}
            dir={document.dir}
            animatePresence
            standalone
          />
        )}
      </AnimatePresence>
    </Sidebar>
  );
}

const PositionedEmpty = styled(Empty)`
  position: absolute;
  top: calc(50vh - 30px);
  transform: translateY(-50%);
`;

const NoComments = styled(Flex)`
  padding-bottom: 65px;
  height: 100%;
`;

const Wrapper = styled.div<{ $hasComments: boolean }>`
  padding-bottom: ${(props) => (props.$hasComments ? "50vh" : "0")};
  height: ${(props) => (props.$hasComments ? "auto" : "100%")};
`;

const NewCommentForm = styled(CommentForm)<{ dir?: "ltr" | "rtl" }>`
  padding: 12px;
  padding-right: ${(props) => (props.dir !== "rtl" ? "18px" : "12px")};
  padding-left: ${(props) => (props.dir === "rtl" ? "18px" : "12px")};
`;

export default observer(Comments);
