import type { LocationDescriptor } from "history";
import { observer, useObserver } from "mobx-react";
import { CommentIcon } from "outline-icons";
import { useRef, Fragment, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import type Note from "~/models/Note";
import type Revision from "~/models/Revision";
import type Template from "~/models/Template";
import { openNoteInsights } from "~/actions/definitions/documents";
import NoteMetaBase, { MetaButton, Separator } from "~/components/NoteMeta";
import Fade from "~/components/Fade";
import { useSplitView } from "~/components/SplitView/context";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import breakpoint from "styled-components-breakpoint";
import { notePath } from "~/utils/routeHelpers";
type Props = {
  /* The note to display meta data for */
  note: Note | Template;
  revision?: Revision;
  to?: LocationDescriptor;
  rtl?: boolean;
};
function TitleNoteMeta({ to, note, revision, rtl, ...rest }: Props) {
  const { views, comments, ui } = useStores();
  const { t } = useTranslation();
  const history = useHistory();
  const { pane } = useSplitView();
  const sidebarContext = useLocationSidebarContext();
  const team = useCurrentTeam();
  const noteViews = useObserver(() => views.inNote(note.id));
  const totalViewers = noteViews.length;
  const onlyYou = totalViewers === 1 && noteViews[0].userId;
  const viewsLoadedOnMount = useRef(totalViewers > 0);
  const can = usePolicy(note);
  const Wrapper = viewsLoadedOnMount.current ? Fragment : Fade;
  const commentsCount = comments.unresolvedCommentsInNoteCount(note.id);
  const commentingEnabled = team.commentingEnabled;
  const commentsOpen = ui.getRightSidebar(pane) === "comments";
  const handleClickMeta = useCallback(() => {
    if (to) {
      history.replace(to);
    }
  }, [history, to]);
  const handleClickComment = useCallback(() => {
    history.push({
      pathname: notePath(note as Note),
      state: { sidebarContext },
    });
    ui.setRightSidebar(commentsOpen ? null : "comments", pane);
  }, [history, note, sidebarContext, ui, pane, commentsOpen]);
  return (
    <Meta
      note={note as Note}
      revision={revision}
      onClick={to ? handleClickMeta : undefined}
      $rtl={rtl}
      {...rest}
    >
      {commentingEnabled && can.comment && (
        <>
          <Separator />
          <MetaButton onClick={handleClickComment} aria-expanded={commentsOpen}>
            <CommentIcon size={18} />
            {commentsCount
              ? t("{{ count }} comment", { count: commentsCount })
              : t("Comment")}
          </MetaButton>
        </>
      )}
      {totalViewers && can.listViews && !(note as Note).isDraft ? (
        <Wrapper>
          <Separator />
          <MetaButton action={openNoteInsights}>
            {t("Viewed by")}{" "}
            {onlyYou
              ? t("only you")
              : `${totalViewers} ${totalViewers === 1 ? t("person") : t("people")}`}
          </MetaButton>
        </Wrapper>
      ) : null}
    </Meta>
  );
}
export const Meta = styled(NoteMetaBase)<{
  $rtl?: boolean;
}>`
  justify-content: ${(props) => (props.$rtl ? "flex-end" : "flex-start")};
  margin: -12px 0 2em 0;
  font-size: 14px;
  position: relative;
  user-select: none;
  z-index: 1;

  ${breakpoint("mobile", "tablet")`
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.6;

    ${Separator} {
      display: none;
    }
  `}

  a {
    color: inherit;
    cursor: var(--pointer);

    &:hover {
      text-decoration: underline;
    }
  }

  @media print {
    display: none;
  }
`;
export default observer(TitleNoteMeta);
