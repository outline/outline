// @flow
import { useObserver } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import Document from "models/Document";
import DocumentMeta from "components/DocumentMeta";
import useStores from "../hooks/useStores";

type Props = {|
  document: Document,
  isDraft: boolean,
  to?: string,
|};

function DocumentMetaWithViews({ to, isDraft, document }: Props) {
  const { views } = useStores();
  const documentViews = useObserver(() => views.inDocument(document.id));
  const totalViewers = documentViews.length;
  const onlyYou = totalViewers === 1 && documentViews[0].user.id;

  return (
    <Meta document={document} to={to}>
      {totalViewers && !isDraft ? (
        <>
          &nbsp;&middot; Viewed by{" "}
          {onlyYou
            ? "only you"
            : `${totalViewers} ${totalViewers === 1 ? "person" : "people"}`}
        </>
      ) : null}
    </Meta>
  );
}

const Meta = styled(DocumentMeta)`
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

export default DocumentMetaWithViews;
