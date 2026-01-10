import type { LocationDescriptor } from "history";
import { observer, useObserver } from "mobx-react";
import { CommentIcon } from "outline-icons";
import { useRef, Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { TeamPreference } from "@shared/types";
import type Document from "~/models/Document";
import type Revision from "~/models/Revision";
import { openDocumentInsights } from "~/actions/definitions/documents";
import DocumentMeta, { Separator } from "~/components/DocumentMeta";
import Fade from "~/components/Fade";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import breakpoint from "styled-components-breakpoint";
import { documentPath } from "~/utils/routeHelpers";
import NudeButton from "~/components/NudeButton";

type Props = {
  /* The document to display meta data for */
  document: Document;
  revision?: Revision;
  to?: LocationDescriptor;
  rtl?: boolean;
};

function TitleDocumentMeta({ to, document, revision, ...rest }: Props) {
  const { views, comments, ui } = useStores();
  const { t } = useTranslation();
  const sidebarContext = useLocationSidebarContext();
  const team = useCurrentTeam();
  const documentViews = useObserver(() => views.inDocument(document.id));
  const totalViewers = documentViews.length;
  const onlyYou = totalViewers === 1 && documentViews[0].userId;
  const viewsLoadedOnMount = useRef(totalViewers > 0);
  const can = usePolicy(document);

  const Wrapper = viewsLoadedOnMount.current ? Fragment : Fade;

  const commentsCount = comments.unresolvedCommentsInDocumentCount(document.id);
  const commentingEnabled = !!team.getPreference(TeamPreference.Commenting);

  return (
    <Meta document={document} revision={revision} to={to} replace {...rest}>
      {commentingEnabled && can.comment && (
        <>
          <Separator />
          <CommentLink
            to={{
              pathname: documentPath(document),
              state: { sidebarContext },
            }}
            onClick={() => ui.toggleComments()}
          >
            <CommentIcon size={18} />
            {commentsCount
              ? t("{{ count }} comment", { count: commentsCount })
              : t("Comment")}
          </CommentLink>
        </>
      )}
      {totalViewers &&
      can.listViews &&
      !document.isDraft &&
      !document.isTemplate ? (
        <Wrapper>
          <Separator />
          <InsightsButton action={openDocumentInsights}>
            {t("Viewed by")}{" "}
            {onlyYou
              ? t("only you")
              : `${totalViewers} ${
                  totalViewers === 1 ? t("person") : t("people")
                }`}
          </InsightsButton>
        </Wrapper>
      ) : null}
    </Meta>
  );
}

const CommentLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 2px;
`;

const InsightsButton = styled(NudeButton)`
  background: none;
  border: none;
  padding: 0;
  width: auto;
  height: auto;
  color: inherit;
  font: inherit;
  text-decoration: none;
  cursor: var(--pointer);

  &:hover {
    text-decoration: underline;
  }
`;

export const Meta = styled(DocumentMeta)<{ rtl?: boolean }>`
  justify-content: ${(props) => (props.rtl ? "flex-end" : "flex-start")};
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

export default observer(TitleDocumentMeta);
