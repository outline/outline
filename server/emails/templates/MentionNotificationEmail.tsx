import * as React from "react";
import { Document } from "@server/models";
import BaseEmail from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import Header from "./components/Header";
import Heading from "./components/Heading";

type InputProps = {
  to: string;
  documentId: string;
  actorName: string;
  eventName: string;
  teamUrl: string;
  mentionId: string;
};

type BeforeSend = {
  document: Document;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when someone mentions them in a doucment
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

  protected subject({ actorName, document }: Props) {
    return `${actorName} mentioned you in "${document.title}"`;
  }

  protected preview({ actorName, eventName }: Props): string {
    return `${actorName} ${eventName} you`;
  }

  protected renderAsText({
    actorName,
    teamUrl,
    document,
    eventName = "mentioned",
    mentionId,
  }: Props): string {
    return `
You were mentioned

${actorName} ${eventName} you in document "${document.title}".

Open Document: ${teamUrl}${document.url}?mentionId=${mentionId}
`;
  }

  protected render({
    document,
    actorName,
    eventName = "mentioned",
    teamUrl,
    mentionId,
  }: Props) {
    const link = `${teamUrl}${document.url}?ref=notification-email&mentionId=${mentionId}`;

    return (
      <EmailTemplate>
        <Header />

        <Body>
          <Heading>You were mentioned</Heading>
          <p>
            {actorName} {eventName} you in document{" "}
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
