// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import parseDocumentSlug from "shared/utils/parseDocumentSlug";
import DocumentMetaWithViews from "components/DocumentMetaWithViews";
import Editor from "components/Editor";
import useStores from "hooks/useStores";

type Props = {
  url: string,
  children: (React.Node) => React.Node,
};

function HoverPreviewDocument({ url, children }: Props) {
  const { documents } = useStores();
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

export default observer(HoverPreviewDocument);
