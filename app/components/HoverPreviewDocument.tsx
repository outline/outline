import { observer } from "mobx-react";
import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import parseDocumentSlug from "shared/utils/parseDocumentSlug";
import DocumentMetaWithViews from "components/DocumentMetaWithViews";
import Editor from "components/Editor";
import useStores from "hooks/useStores";

type Props = {
  url: string;
  children: (arg0: React.ReactNode) => React.ReactNode;
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
          // @ts-expect-error ts-migrate(2322) FIXME: Type '{ key: any; defaultValue: any; disableEmbeds... Remove this comment to see the full error message
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

// @ts-expect-error ts-migrate(2345) FIXME: Argument of type '({ url, children }: Props) => Re... Remove this comment to see the full error message
export default observer(HoverPreviewDocument);
