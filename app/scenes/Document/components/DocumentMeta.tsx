import { LocationDescriptor } from "history";
import { observer, useObserver } from "mobx-react";
import { CommentIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link, useRouteMatch } from "react-router-dom";
import styled from "styled-components";
import { TeamPreference } from "@shared/types";
import Document from "~/models/Document";
import Revision from "~/models/Revision";
import DocumentMeta from "~/components/DocumentMeta";
import Fade from "~/components/Fade";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { documentPath, documentInsightsPath } from "~/utils/routeHelpers";

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
  const match = useRouteMatch();
  const sidebarContext = useLocationSidebarContext();
  const team = useCurrentTeam();
  const documentViews = useObserver(() => views.inDocument(document.id));
  const totalViewers = documentViews.length;
  const onlyYou = totalViewers === 1 && documentViews[0].userId;
  const viewsLoadedOnMount = React.useRef(totalViewers > 0);
  const can = usePolicy(document);

  const Wrapper = viewsLoadedOnMount.current ? React.Fragment : Fade;

  const insightsPath = documentInsightsPath(document);
  const commentsCount = comments.unresolvedCommentsInDocumentCount(document.id);

  return (
    <Meta document={document} revision={revision} to={to} replace {...rest}>
      {team.getPreference(TeamPreference.Commenting) && can.comment && (
        <>
          &nbsp;•&nbsp;
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
          &nbsp;•&nbsp;
          <Link
            to={{
              pathname:
                match.url === insightsPath
                  ? documentPath(document)
                  : insightsPath,
              state: { sidebarContext },
            }}
          >
            {t("Viewed by")}{" "}
            {onlyYou
              ? t("only you")
              : `${totalViewers} ${
                  totalViewers === 1 ? t("person") : t("people")
                }`}
          </Link>
        </Wrapper>
      ) : null}
    </Meta>
  );
}

const CommentLink = styled(Link)`
  display: inline-flex;
  align-items: center;
`;

export const Meta = styled(DocumentMeta)<{ rtl?: boolean }>`
  justify-content: ${(props) => (props.rtl ? "flex-end" : "flex-start")};
  margin: -12px 0 2em 0;
  font-size: 14px;
  position: relative;
  user-select: none;
  z-index: 1;

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
