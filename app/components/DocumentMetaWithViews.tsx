import { LocationDescriptor } from "history";
import { observer, useObserver } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link, useRouteMatch } from "react-router-dom";
import styled from "styled-components";
import Document from "~/models/Document";
import DocumentMeta from "~/components/DocumentMeta";
import useStores from "~/hooks/useStores";
import { documentUrl, documentInsightsUrl } from "~/utils/routeHelpers";
import Fade from "./Fade";

type Props = {
  document: Document;
  isDraft: boolean;
  to?: LocationDescriptor;
  rtl?: boolean;
};

function DocumentMetaWithViews({ to, isDraft, document, ...rest }: Props) {
  const { views } = useStores();
  const { t } = useTranslation();
  const match = useRouteMatch();
  const documentViews = useObserver(() => views.inDocument(document.id));
  const totalViewers = documentViews.length;
  const onlyYou = totalViewers === 1 && documentViews[0].user.id;
  const viewsLoadedOnMount = React.useRef(totalViewers > 0);

  const insightsUrl = documentInsightsUrl(document);
  const Wrapper = viewsLoadedOnMount.current ? React.Fragment : Fade;

  return (
    <Meta document={document} to={to} replace {...rest}>
      {totalViewers && !isDraft ? (
        <Wrapper>
          &nbsp;•&nbsp;
          <Link
            to={match.url === insightsUrl ? documentUrl(document) : insightsUrl}
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

const Meta = styled(DocumentMeta)<{ rtl?: boolean }>`
  justify-content: ${(props) => (props.rtl ? "flex-end" : "flex-start")};
  margin: -12px 0 2em 0;
  font-size: 14px;
  position: relative;
  z-index: 1;

  a {
    color: inherit;

    &:hover {
      text-decoration: underline;
    }
  }

  @media print {
    display: none;
  }
`;

export default observer(DocumentMetaWithViews);
