import { observer } from "mobx-react";
import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import DocumentMeta from "~/components/DocumentMeta";
import Editor from "~/components/Editor";
import useStores from "~/hooks/useStores";

type Props = {
  /* The document associated with the editor, if any */
  id?: string;
  /* The URL we want a preview for */
  url: string;
  children: (content: React.ReactNode) => React.ReactNode;
};

function HoverPreviewDocument({ url, id, children }: Props) {
  const { documents } = useStores();
  const slug = parseDocumentSlug(url);

  React.useEffect(() => {
    if (slug) {
      void documents.prefetchDocument(slug);
    }
  }, [documents, slug]);

  const document = slug ? documents.getByUrl(slug) : undefined;
  if (!document || document.id === id) {
    return null;
  }

  return (
    <>
      {children(
        <Content to={document.url}>
          <Heading>{document.titleWithDefault}</Heading>
          <DocumentMeta document={document} />

          <React.Suspense fallback={<div />}>
            <Editor
              key={document.id}
              defaultValue={document.getSummary()}
              embedsDisabled
              readOnly
            />
          </React.Suspense>
        </Content>
      )}
    </>
  );
}

const Content = styled(Link)`
  cursor: var(--pointer);
`;

const Heading = styled.h2`
  margin: 0 0 0.75em;
  color: ${s("text")};
`;

export default observer(HoverPreviewDocument);
