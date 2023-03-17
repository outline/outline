import * as React from "react";
import { Document } from "@server/models";
import BaseEmail, { EmailProps } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import Header from "./components/Header";
import Heading from "./components/Heading";

type InputProps = EmailProps & {
  documentId: string;
  actorName: string;
  teamUrl: string;
  mentionId: string;
};

type BeforeSend = {
  document: Document;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when someone mentions them in a document.
 */
export default class MentionNotificationEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected async beforeSend({ documentId }: InputProps) {
    const document = await Document.unscoped().findByPk(documentId);
    if (!document) {
      return false;
    }

    return { document };
  }

  protected subject({ document }: Props) {
    return `Mentioned you in “${document.title}”`;
  }

  protected preview({ actorName }: Props): string {
    return `${actorName} mentioned you`;
  }

  protected fromName({ actorName }: Props) {
    return actorName;
  }

  protected renderAsText({
    actorName,
    teamUrl,
    document,
    mentionId,
  }: Props): string {
    return `
You were mentioned

${actorName} mentioned you in the document “${document.title}”.

Open Document: ${teamUrl}${document.url}?mentionId=${mentionId}
`;
  }

  protected render({ document, actorName, teamUrl, mentionId }: Props) {
    const link = `${teamUrl}${document.url}?ref=notification-email&mentionId=${mentionId}`;

    return (
      <EmailTemplate>
        <Header />

        <Body>
          <Heading>You were mentioned</Heading>
          <p>
            {actorName} mentioned you in the document{" "}
            <a href={link}>{document.title}</a>.
          </p>
          <p>
            <Button href={link}>Open Document</Button>
          </p>
        </Body>
      </EmailTemplate>
    );
  }
}
