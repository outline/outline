import * as React from "react";
import { richExtensions } from "@shared/editor/nodes";
import type { UnfurlResourceType, UnfurlResponse } from "@shared/types";
import Editor from "~/components/Editor";
import Flex from "~/components/Flex";
import ErrorBoundary from "../ErrorBoundary";
import useStores from "~/hooks/useStores";
import { observer } from "mobx-react";
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
  
  const { documents, collections } = useStores();
  const document = documents.get(id);

  React.useEffect(() => {
    if (!document) {
      void documents.fetch(id);
    } else if (document.collectionId) {
      if (!collections.get(document.collectionId)) {
        void collections.fetch(document.collectionId);
      }
    }
  }, [id, document, documents, collections]);

  const breadcrumbNames = [];
  
  if (document) {
    if (document.collectionId) {
      const collection = collections.get(document.collectionId);
      if (collection) {
        breadcrumbNames.push(collection.name);
      }
    }

    const parentNames = [];
    let currentParentId = document.parentDocumentId;
    let depth = 0;
    
    while (currentParentId && depth < 10) {
      const parentDoc = documents.get(currentParentId);
      if (parentDoc) {
        parentNames.unshift(parentDoc.title);
        currentParentId = parentDoc.parentDocumentId;
      } else {
        void documents.fetch(currentParentId);
        break;
      }
      depth++;
    }
    
    breadcrumbNames.push(...parentNames);
  }

  const content = (
    <Card ref={ref}>
      <CardContent>
        <ErrorBoundary showTitle={false} reloadOnChunkMissing={false}>
          <Flex column gap={2}>
            {breadcrumbNames.length > 0 && (
              <BreadcrumbContainer>
                {breadcrumbNames.map((name, index) => (
                  <span key={index}>{name}</span>
                ))}
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