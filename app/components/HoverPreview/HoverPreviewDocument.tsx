import * as React from "react";
import Editor from "~/components/Editor";
import Flex from "~/components/Flex";
import { Preview, Title, Description, Summary } from "./Components";

type Props = {
  /** Document id associated with the editor, if any */
  id?: string;
  /** Document url */
  url: string;
  /** Title for the preview card */
  title: string;
  /** Description about recent activity on document */
  description: string;
  /** Summary of document content */
  summary: string;
};

function HoverPreviewDocument({ id, url, title, description, summary }: Props) {
  return (
    <Preview to={url}>
      <Flex column>
        <Title>{title}</Title>
        <Description type="tertiary" size="xsmall">
          {description}
        </Description>
        <Summary>
          <React.Suspense fallback={<div />}>
            <Editor key={id} defaultValue={summary} embedsDisabled readOnly />
          </React.Suspense>
        </Summary>
      </Flex>
    </Preview>
  );
}

export default HoverPreviewDocument;
