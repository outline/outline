import { AnimatePresence } from "framer-motion";
import { observer } from "mobx-react";
import { DoneIcon } from "outline-icons";
import queryString from "query-string";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation, useRouteMatch } from "react-router-dom";
import styled, { css } from "styled-components";
import { ProsemirrorData } from "@shared/types";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Scrollable from "~/components/Scrollable";
import Tooltip from "~/components/Tooltip";
import useBoolean from "~/hooks/useBoolean";
import useFocusedComment from "~/hooks/useFocusedComment";
import useKeyDown from "~/hooks/useKeyDown";
import usePersistedState from "~/hooks/usePersistedState";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { bigPulse } from "~/styles/animations";
import CommentForm from "./CommentForm";
import CommentThread from "./CommentThread";
import Sidebar from "./SidebarLayout";

function Comments() {
  const { ui, comments, documents } = useStores();
  const { t } = useTranslation();
  const location = useLocation();
  const history = useHistory();
  const match = useRouteMatch<{ documentSlug: string }>();
  const params = useQuery();
  // We need to control scroll behaviour when reaction picker is opened / closed.
  const [scrollable, enableScroll, disableScroll] = useBoolean(true);
  const [pulse, setPulse] = React.useState(false);
  const document = documents.getByUrl(match.params.documentSlug);
  const focusedComment = useFocusedComment();
  const can = usePolicy(document);

  useKeyDown("Escape", () => document && ui.collapseComments(document?.id));

  const [draft, onSaveDraft] = usePersistedState<ProsemirrorData | undefined>(
    `draft-${document?.id}-new`,
    undefined
  );

  const viewingResolved = params.get("resolved") === "";
  const resolvedThreads = document
    ? comments.resolvedThreadsInDocument(document.id)
    : [];
  const resolvedThreadsCount = resolvedThreads.length;

  React.useEffect(() => {
    setPulse(true);
    const timeout = setTimeout(() => setPulse(false), 250);

    return () => {
      clearTimeout(timeout);
      setPulse(false);
    };
  }, [resolvedThreadsCount]);

  if (!document) {
    return null;
  }

  const threads = viewingResolved
    ? resolvedThreads
    : comments.unresolvedThreadsInDocument(document.id);
  const hasComments = threads.length > 0;

  const toggleViewingResolved = () => {
    history.push({
      search: queryString.stringify({
        ...queryString.parse(location.search),
        resolved: viewingResolved ? undefined : "",
      }),
      pathname: location.pathname,
    });
  };

  return (
    <Sidebar
      title={
        <Flex align="center" justify="space-between" auto>
          {viewingResolved ? (
            <React.Fragment key="resolved">
              <span>{t("Resolved comments")}</span>
              <Tooltip delay={500} content={t("View comments")}>
                <ResolvedButton
                  neutral
                  borderOnHover
                  icon={<DoneIcon />}
                  onClick={toggleViewingResolved}
                />
              </Tooltip>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <span>{t("Comments")}</span>
              <Tooltip delay={250} content={t("View resolved comments")}>
                <ResolvedButton
                  neutral
                  borderOnHover
                  icon={<DoneIcon outline />}
                  onClick={toggleViewingResolved}
                  $pulse={pulse}
                />
              </Tooltip>
            </React.Fragment>
          )}
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
        overflow={scrollable ? "auto" : "hidden"}
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

const ResolvedButton = styled(Button)<{ $pulse: boolean }>`
  ${(props) =>
    props.$pulse &&
    css`
      animation: ${bigPulse} 250ms 1;
    `}
`;

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
