import * as React from "react";
import { richExtensions } from "@shared/editor/nodes";
import type { UnfurlResourceType, UnfurlResponse } from "@shared/types";
import Editor from "~/components/Editor";
import Flex from "~/components/Flex";
import ErrorBoundary from "../ErrorBoundary";
import useStores from "~/hooks/useStores";
import { observer } from "mobx-react";
import DocumentBreadcrumb from "~/components/DocumentBreadcrumb";
import {
  Preview,
  Title,
  Info,
  Card,
  CardContent,
  Description,
  BreadcrumbContainer,
} from "./Components";

type Props = Omit<UnfurlResponse[UnfurlResourceType.Document], "type"> & {
  ref?: React.Ref<HTMLDivElement>;
};

const HoverPreviewDocument = observer(({
  url,
  id,
  title,
  summary,
  lastActivityByViewer,
  ref,
}: Props) => {
  const parsedUrl = new URL(url, window.location.href);
  
  const { documents } = useStores();
  const document = documents.get(id);

  // We only need to fetch the document. 
  // DocumentBreadcrumb handles loading the collection and relations internally.
  React.useEffect(() => {
    if (!document) {
      void documents.fetch(id);
    }
  }, [id, document, documents]);

  const content = (
    <Card ref={ref}>
      <CardContent>
        <ErrorBoundary showTitle={false} reloadOnChunkMissing={false}>
          <Flex column gap={2}>
            
            {/* Wrap the built-in breadcrumb in your container for CSS spacing */}
            {document && (
              <BreadcrumbContainer>
                <DocumentBreadcrumb document={document} onlyText />
              </BreadcrumbContainer>
            )}

            <Title>{title}</Title>
            {lastActivityByViewer && <Info>{lastActivityByViewer}</Info>}
            <Description as="div">
              <React.Suspense fallback={<div />}>
                <Editor
                  key={id}
                  extensions={richExtensions}
                  defaultValue={summary}
                  embedsDisabled
                  readOnly
                />
              </React.Suspense>
            </Description>
          </Flex>
        </ErrorBoundary>
      </CardContent>
    </Card>
  );

  if (parsedUrl.origin !== window.location.origin) {
    return (
      <Preview as="a" href={url}>
        {content}
      </Preview>
    );
  }

  return (
    <Preview to={`${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`}>
      {content}
    </Preview>
  );
});

export default HoverPreviewDocument;