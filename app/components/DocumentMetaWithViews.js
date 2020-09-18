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
  const totalViewers = useObserver(() => views.uniqueForDocument(document.id));

  return (
    <Meta document={document} to={to}>
      {totalViewers && !isDraft ? (
        <>
          &nbsp;&middot; Viewed by{" "}
          {totalViewers === 1 ? "only you" : `${totalViewers} people`}
        </>
      ) : null}
    </Meta>
  );
}

const Meta = styled(DocumentMeta)`
  margin: -12px 0 2em 0;
  font-size: 14px;

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
