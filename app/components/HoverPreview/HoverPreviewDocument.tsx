import * as React from "react";
import Editor from "~/components/Editor";
import Flex from "~/components/Flex";
import {
  Preview,
  Title,
  Info,
  DescriptionContainer,
  Card,
  CardContent,
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

function HoverPreviewDocument({ id, url, title, info, description }: Props) {
  return (
    <Preview to={url}>
      <Card>
        <CardContent>
          <Flex column gap={2}>
            <Title>{title}</Title>
            <Info>{info}</Info>
            <DescriptionContainer>
              <React.Suspense fallback={<div />}>
                <Editor
                  key={id}
                  defaultValue={description}
                  embedsDisabled
                  readOnly
                />
              </React.Suspense>
            </DescriptionContainer>
          </Flex>
        </CardContent>
      </Card>
    </Preview>
  );
}

export default HoverPreviewDocument;
