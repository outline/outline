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

  protected subject() {
    return "You are mentioned";
  }

  protected preview({ actorName, eventName }: Props): string {
    return `${actorName} ${eventName} you`;
  }

  protected renderAsText({
    actorName,
    teamUrl,
    document,
    eventName = "mentioned",
  }: Props): string {
    return `
You are mentioned

${actorName} ${eventName} you in document "${document.title}".

Open Document: ${teamUrl}${document.url}
`;
  }

  protected render({
    document,
    actorName,
    eventName = "mentioned",
    teamUrl,
  }: Props) {
    const link = `${teamUrl}${document.url}?ref=notification-email`;

    return (
      <EmailTemplate>
        <Header />

        <Body>
          <Heading>You are mentioned</Heading>
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
