import * as React from "react";
import { richExtensions } from "@shared/editor/nodes";
import { UnfurlResourceType, UnfurlResponse } from "@shared/types";
import Editor from "~/components/Editor";
import Flex from "~/components/Flex";
import ErrorBoundary from "../ErrorBoundary";
import {
  Preview,
  Title,
  Info,
  Card,
  CardContent,
  Description,
} from "./Components";

type Props = Omit<UnfurlResponse[UnfurlResourceType.Document], "type">;

const HoverPreviewDocument = React.forwardRef(function _HoverPreviewDocument(
  { url, id, title, summary, lastActivityByViewer }: Props,
  ref: React.Ref<HTMLDivElement>
) {
  return (
    <Preview to={url}>
      <Card ref={ref}>
        <CardContent>
          <ErrorBoundary showTitle={false} reloadOnChunkMissing={false}>
            <Flex column gap={2}>
              <Title>{title}</Title>
              <Info>{lastActivityByViewer}</Info>
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
    </Preview>
  );
});

export default HoverPreviewDocument;
