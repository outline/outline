import type { LocationDescriptor } from "history";
import { observer, useObserver } from "mobx-react";
import { CommentIcon } from "outline-icons";
import { useRef, Fragment, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import type Document from "~/models/Document";
import type Revision from "~/models/Revision";
import type Template from "~/models/Template";
import { openDocumentInsights } from "~/actions/definitions/documents";
import DocumentMeta from "~/components/DocumentMeta";
import {
  MetaButton,
  Separator,
  headerMetaStyles,
} from "~/components/HeaderMeta";
import Fade from "~/components/Fade";
import { useSplitView } from "~/components/SplitView/context";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { documentPath } from "~/utils/routeHelpers";

type Props = {
  /* The document to display meta data for */
  document: Document | Template;
  revision?: Revision;
  to?: LocationDescriptor;
  rtl?: boolean;
};

function TitleDocumentMeta({ to, document, revision, rtl, ...rest }: Props) {
  const { views, comments, ui } = useStores();
  const { t } = useTranslation();
  const history = useHistory();
  const { pane } = useSplitView();
  const sidebarContext = useLocationSidebarContext();
  const team = useCurrentTeam();
  const documentViews = useObserver(() => views.inDocument(document.id));
  const totalViewers = documentViews.length;
  const onlyYou = totalViewers === 1 && documentViews[0].userId;
  const viewsLoadedOnMount = useRef(totalViewers > 0);
  const can = usePolicy(document);

  const Wrapper = viewsLoadedOnMount.current ? Fragment : Fade;

  const commentsCount = comments.unresolvedCommentsInDocumentCount(document.id);
  const commentingEnabled = team.commentingEnabled;
  const commentsOpen = ui.getRightSidebar(pane) === "comments";

  const handleClickMeta = useCallback(() => {
    if (to) {
      history.replace(to);
    }
  }, [history, to]);

  const handleClickComment = useCallback(() => {
    history.push({
      pathname: documentPath(document as Document),
      state: { sidebarContext },
    });
    ui.setRightSidebar(commentsOpen ? null : "comments", pane);
  }, [history, document, sidebarContext, ui, pane, commentsOpen]);

  return (
    <Meta
      document={document as Document}
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
      {totalViewers && can.listViews && !(document as Document).isDraft ? (
        <Wrapper>
          <Separator />
          <MetaButton action={openDocumentInsights}>
            {t("Viewed by")}{" "}
            {onlyYou
              ? t("only you")
              : `${totalViewers} ${
                  totalViewers === 1 ? t("person") : t("people")
                }`}
          </MetaButton>
        </Wrapper>
      ) : null}
    </Meta>
  );
}

export const Meta = styled(DocumentMeta)<{ $rtl?: boolean }>`
  ${headerMetaStyles}
`;

export default observer(TitleDocumentMeta);
