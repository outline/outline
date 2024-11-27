import { AnimatePresence } from "framer-motion";
import { observer } from "mobx-react";
import { ArrowIcon } from "outline-icons";
import * as React from "react";
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
import useBoolean from "~/hooks/useBoolean";
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
  // We need to control scroll behaviour when reaction picker is opened / closed.
  const [scrollable, enableScroll, disableScroll] = useBoolean(true);
  const document = documents.getByUrl(match.params.documentSlug);
  const focusedComment = useFocusedComment();
  const can = usePolicy(document);

  const scrollableRef = React.useRef<HTMLDivElement | null>(null);
  const prevThreadCount = React.useRef(0);
  const isAtBottom = React.useRef(true);
  const [showJumpToRecentBtn, setShowJumpToRecentBtn] = React.useState(false);

  useKeyDown("Escape", () => document && ui.set({ commentsExpanded: false }));

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

  React.useEffect(() => {
    // Handles: 1. on refresh 2. when switching sort setting
    const readyToDisplay = Boolean(document && isEditorInitialized);
    if (readyToDisplay && sortOption.type === CommentSortType.MostRecent) {
      scrollToBottom();
    }
  }, [sortOption.type, document, isEditorInitialized]);

  React.useEffect(() => {
    setShowJumpToRecentBtn(false);
    if (sortOption.type === CommentSortType.MostRecent) {
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
  }, [sortOption.type, threads.length]);

  if (!document || !isEditorInitialized) {
    return null;
  }

  return (
    <Sidebar
      title={
        <Flex align="center" justify="space-between" auto>
          <span>{t("Comments")}</span>
          <CommentSortMenu />
        </Flex>
      }
      onClose={() => ui.set({ commentsExpanded: false })}
      scrollable={false}
    >
      <Scrollable
        id="comments"
        bottomShadow={!focusedComment}
        hiddenScrollbars
        topShadow
        overflow={scrollable ? "auto" : "hidden"}
        style={{ overflowX: "hidden" }}
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
                enableScroll={enableScroll}
                disableScroll={disableScroll}
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

const ArrowDownIcon = styled(ArrowIcon)`
  transform: rotate(90deg);
`;

const NewCommentForm = styled(CommentForm)<{ dir?: "ltr" | "rtl" }>`
  padding: 12px;
  padding-right: ${(props) => (props.dir !== "rtl" ? "18px" : "12px")};
  padding-left: ${(props) => (props.dir === "rtl" ? "18px" : "12px")};
`;

export default observer(Comments);
