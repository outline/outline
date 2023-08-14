import * as React from "react";
import Editor from "~/components/Editor";
import Flex from "~/components/Flex";
import {
  Preview,
  Title,
  Info,
  Card,
  CardContent,
  Description,
} from "./Components";

type Props = {
  /** Document id associated with the editor, if any */
  id?: string;
  /** Document url */
  url: string;
  /** Title for the preview card */
  title: string;
  /** Info about last activity on the document */
  info: string;
  /** Text preview of document content */
  description: string;
};

const HoverPreviewDocument = React.forwardRef(function _HoverPreviewDocument(
  { id, url, title, info, description }: Props,
  ref: React.Ref<HTMLDivElement>
) {
  return (
    <Preview to={url}>
      <Card ref={ref}>
        <CardContent>
          <Flex column gap={2}>
            <Title>{title}</Title>
            <Info>{info}</Info>
            <Description as="div">
              <React.Suspense fallback={<div />}>
                <Editor
                  key={id}
                  defaultValue={description}
                  embedsDisabled
                  readOnly
                />
              </React.Suspense>
            </Description>
          </Flex>
        </CardContent>
      </Card>
    </Preview>
  );
});

export default HoverPreviewDocument;
