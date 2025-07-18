import { observer } from "mobx-react";
import * as React from "react";
import { useRouteMatch } from "react-router-dom";
import Document from "~/scenes/Document";
import Reader from "~/scenes/Reader";
import useStores from "~/hooks/useStores";
import { matchDocumentSlug } from "~/utils/routeHelpers";

function DocumentRouter() {
  const match = useRouteMatch<{ slug: string }>(`/doc/${matchDocumentSlug}`);
  const { documents } = useStores();
  const document = documents.getByUrl(match.params.slug);

  if (!document) {
    return null;
  }

  if (document.documentType === "research-paper") {
    return <Reader />;
  }

  return <Document />;
}

export default observer(DocumentRouter);
