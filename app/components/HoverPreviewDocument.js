// @flow
import { inject, observer } from "mobx-react";
import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import parseDocumentSlug from "shared/utils/parseDocumentSlug";
import DocumentsStore from "stores/DocumentsStore";
import DocumentMetaWithViews from "components/DocumentMetaWithViews";
import Editor from "components/Editor";

type Props = {
  url: string,
  documents: DocumentsStore,
  children: (React.Node) => React.Node,
};

function HoverPreviewDocument({ url, documents, children }: Props) {
  const slug = parseDocumentSlug(url);

  documents.prefetchDocument(slug, {
    prefetch: true,
  });

  const document = slug ? documents.getByUrl(slug) : undefined;
  if (!document) return null;

  return children(
    <Content to={document.url}>
      <Heading>{document.titleWithDefault}</Heading>
      <DocumentMetaWithViews isDraft={document.isDraft} document={document} />

      <React.Suspense fallback={<div />}>
        <Editor
          key={document.id}
          defaultValue={document.getSummary()}
          disableEmbeds
          readOnly
        />
      </React.Suspense>
    </Content>
  );
}

const Content = styled(Link)`
  cursor: pointer;
`;

const Heading = styled.h2`
  margin: 0 0 0.75em;
  color: ${(props) => props.theme.text};
`;

export default inject("documents")(observer(HoverPreviewDocument));
