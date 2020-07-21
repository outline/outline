// @flow
import * as React from "react";
import { inject, observer } from "mobx-react";
import { Link } from "react-router-dom";
import Editor from "components/Editor";
import styled from "styled-components";
import { parseDocumentSlugFromUrl } from "shared/utils/parseDocumentIds";
import DocumentsStore from "stores/DocumentsStore";
import DocumentMeta from "components/DocumentMeta";

type Props = {
  url: string,
  documents: DocumentsStore,
  children: React.Node => React.Node,
};

function HoverPreviewDocument({ url, documents, children }: Props) {
  const slug = parseDocumentSlugFromUrl(url);

  documents.prefetchDocument(slug, {
    prefetch: true,
  });

  const document = slug ? documents.getByUrl(slug) : undefined;
  if (!document) return null;

  return children(
    <Content to={document.url}>
      <Heading>{document.title}</Heading>
      <DocumentMeta isDraft={document.isDraft} document={document} />

      <Editor
        key={document.id}
        defaultValue={document.getSummary()}
        disableEmbeds
        readOnly
      />
    </Content>
  );
}

const Content = styled(Link)`
  cursor: pointer;
`;

const Heading = styled.h2`
  margin: 0 0 0.75em;
  color: ${props => props.theme.text};
`;

export default inject("documents")(observer(HoverPreviewDocument));
