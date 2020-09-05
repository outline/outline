// @flow
import { inject } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import ViewsStore from "stores/ViewsStore";
import Document from "models/Document";
import DocumentMeta from "components/DocumentMeta";

type Props = {|
  views: ViewsStore,
  document: Document,
  isDraft: boolean,
  to?: string,
|};

function DocumentMetaWithViews({ views, to, isDraft, document }: Props) {
  const totalViews = views.countForDocument(document.id);

  return (
    <Meta document={document} to={to}>
      {totalViews && !isDraft ? (
        <>
          &nbsp;&middot; Viewed{" "}
          {totalViews === 1 ? "once" : `${totalViews} times`}
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

export default inject("views")(DocumentMetaWithViews);
