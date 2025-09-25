import { AnimatePresence } from "framer-motion";
import { observer } from "mobx-react";
import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouteMatch } from "react-router-dom";
import styled from "styled-components";
import { ProsemirrorData, UserPreference } from "@shared/types";
import ButtonSmall from "~/components/ButtonSmall";
import { useDocumentContext } from "~/components/DocumentContext";
import Empty from "~/components/Empty";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import Scrollable from "~/components/Scrollable";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useFocusedComment } from "~/hooks/useFocusedComment";
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
import useMobile from "~/hooks/useMobile";
import { ArrowDownIcon } from "~/components/Icons/ArrowIcon";

function Comments() {
  const { ui, comments, documents } = useStores();
  const user = useCurrentUser();
  const { editor, isEditorInitialized } = useDocumentContext();
  const { t } = useTranslation();
  const match = useRouteMatch<{ documentSlug: string }>();
  const document = documents.get(match.params.documentSlug);
  const focusedComment = useFocusedComment();
  const can = usePolicy(document);
  const isMobile = useMobile();

  const query = useQuery();
  const [viewingResolved, setViewingResolved] = useState(
    query.get("resolved") !== null || focusedComment?.isResolved || false
  );
  const scrollableRef = useRef<HTMLDivElement | null>(null);
  const prevThreadCount = useRef(0);
  const isAtBottom = useRef(true);
  const [showJumpToRecentBtn, setShowJumpToRecentBtn] = useState(false);

  useKeyDown("Escape", () => document && ui.set({ commentsExpanded: false }));

  // Account for the resolved status of the comment changing
  useEffect(() => {
    if (focusedComment && focusedComment.isResolved !== viewingResolved) {
      setViewingResolved(focusedComment.isResolved);
    }
  }, [focusedComment, viewingResolved]);

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

  const threads = !document
    ? []
    : viewingResolved
      ? comments.resolvedThreadsInDocument(document.id, sortOption)
      : comments.unresolvedThreadsInDocument(document.id, sortOption);
  const hasComments = threads.length > 0;

  const scrollToBottom = () => {
    if (scrollableRef.current) {
      scrollableRef.current.scrollTo({
        top: scrollableRef.current.scrollHeight,
      });
    }
  };

  const handleScroll = () => {
    const BUFFER_PX = 50;

    if (scrollableRef.current) {
      const sh = scrollableRef.current.scrollHeight;
      const st = scrollableRef.current.scrollTop;
      const ch = scrollableRef.current.clientHeight;
      isAtBottom.current = Math.abs(sh - (st + ch)) <= BUFFER_PX;

      if (isAtBottom.current) {
        setShowJumpToRecentBtn(false);
      }
    }
  };

  useEffect(() => {
    // Handles: 1. on refresh 2. when switching sort setting
    const readyToDisplay = Boolean(document && isEditorInitialized);
    if (
      readyToDisplay &&
      sortOption.type === CommentSortType.MostRecent &&
      !viewingResolved
    ) {
      scrollToBottom();
    }
  }, [sortOption.type, document, isEditorInitialized, viewingResolved]);

  useEffect(() => {
    setShowJumpToRecentBtn(false);
    if (sortOption.type === CommentSortType.MostRecent && !viewingResolved) {
      const commentsAdded = threads.length > prevThreadCount.current;
      if (commentsAdded) {
        if (isAtBottom.current) {
          scrollToBottom(); // Remain pinned to bottom on new comments
        } else {
          setShowJumpToRecentBtn(true);
        }
      }
    }
    prevThreadCount.current = threads.length;
  }, [sortOption.type, threads.length, viewingResolved]);

  const content =
    !document || !isEditorInitialized ? null : (
      <>
        <Scrollable
          id="comments"
          bottomShadow={!focusedComment}
          hiddenScrollbars
          topShadow
          ref={scrollableRef}
          onScroll={handleScroll}
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
            {showJumpToRecentBtn && (
              <Fade>
                <JumpToRecent onClick={scrollToBottom}>
                  <Flex align="center">
                    {t("New comments")}&nbsp;
                    <ArrowDownIcon size={20} />
                  </Flex>
                </JumpToRecent>
              </Fade>
            )}
          </Wrapper>
        </Scrollable>
        <AnimatePresence initial={false}>
          {(!focusedComment || isMobile) && can.comment && !viewingResolved && (
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
      </>
    );

  return (
    <Sidebar
      title={
        <Flex align="center" justify="space-between" gap={8} auto>
          <div style={isMobile ? { padding: "0 8px" } : undefined}>
            {t("Comments")}
          </div>
          <CommentSortMenu
            viewingResolved={viewingResolved}
            onChange={(val) => {
              setViewingResolved(val === "resolved");
            }}
          />
        </Flex>
      }
      onClose={() => ui.set({ commentsExpanded: false })}
      scrollable={false}
    >
      {content}
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
  height: ${(props) => (props.$hasComments ? "auto" : "100%")};
`;

const JumpToRecent = styled(ButtonSmall)`
  position: sticky;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0.8;
  border-radius: 12px;
  padding: 0 4px;

  &:hover {
    opacity: 1;
  }
`;

const NewCommentForm = styled(CommentForm)<{ dir?: "ltr" | "rtl" }>`
  padding: 12px;
  padding-right: ${(props) => (props.dir !== "rtl" ? "18px" : "12px")};
  padding-left: ${(props) => (props.dir === "rtl" ? "18px" : "12px")};
`;

export default observer(Comments);
