// @flow
import * as React from "react";
import styled from "styled-components";
import { inject } from "mobx-react";
import ViewsStore from "stores/ViewsStore";
import Document from "models/Document";
import PublishingInfo from "components/PublishingInfo";

type Props = {|
  views: ViewsStore,
  document: Document,
  isDraft: boolean,
|};

function DocumentMeta({ views, isDraft, document }: Props) {
  const totalViews = views.countForDocument(document.id);

  return (
    <Meta document={document}>
      {totalViews && !isDraft ? (
        <React.Fragment>
          &nbsp;&middot; Viewed{" "}
          {totalViews === 1 ? "once" : `${totalViews} times`}
        </React.Fragment>
      ) : null}
    </Meta>
  );
}

const Meta = styled(PublishingInfo)`
  margin: -12px 0 2em 0;
  font-size: 14px;

  @media print {
    display: none;
  }
`;

export default inject("views")(DocumentMeta);
