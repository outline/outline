import inlineCss from "inline-css";
import * as React from "react";
import { NotificationEventType } from "@shared/types";
import env from "@server/env";
import { Document, User } from "@server/models";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import BaseEmail, { EmailProps } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import Diff from "./components/Diff";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type InputProps = EmailProps & {
  userId: string;
  documentId: string;
  actorName: string;
  collectionName: string;
  eventType:
    | NotificationEventType.PublishDocument
    | NotificationEventType.UpdateDocument;
  teamUrl: string;
  content?: string;
};

type BeforeSend = {
  document: Document;
  unsubscribeUrl: string;
  body: string | undefined;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when they have enabled document notifications, the event
 * may be published or updated.
 */
export default class DocumentPublishedOrUpdatedEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected async beforeSend({
    documentId,
    eventType,
    userId,
    content,
  }: InputProps) {
    const document = await Document.unscoped().findByPk(documentId);
    if (!document) {
      return false;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return false;
    }

    // inline all css so that it works in as many email providers as possible.
    let body;
    if (content) {
      body = await inlineCss(content, {
        url: env.URL,
        applyStyleTags: true,
        applyLinkTags: false,
        removeStyleTags: true,
      });
    }

    return {
      document,
      body,
      unsubscribeUrl: NotificationSettingsHelper.unsubscribeUrl(
        user,
        eventType
      ),
    };
  }

  eventName(eventType: NotificationEventType) {
    switch (eventType) {
      case NotificationEventType.PublishDocument:
        return "published";
      case NotificationEventType.UpdateDocument:
        return "updated";
      default:
        return "";
    }
  }

  protected subject({ document, eventType }: Props) {
    return `“${document.title}” ${this.eventName(eventType)}`;
  }

  protected preview({ actorName, eventType }: Props): string {
    return `${actorName} ${this.eventName(eventType)} a document`;
  }

  protected renderAsText({
    actorName,
    teamUrl,
    document,
    collectionName,
    eventType,
  }: Props): string {
    const eventName = this.eventName(eventType);

    return `
"${document.title}" ${eventName}

${actorName} ${eventName} the document "${document.title}", in the ${collectionName} collection.

Open Document: ${teamUrl}${document.url}
`;
  }

  protected render({
    document,
    actorName,
    collectionName,
    eventType,
    teamUrl,
    unsubscribeUrl,
    body,
  }: Props) {
    const link = `${teamUrl}${document.url}?ref=notification-email`;
    const eventName = this.eventName(eventType);

    return (
      <EmailTemplate>
        <Header />

        <Body>
          <Heading>
            “{document.title}” {eventName}
          </Heading>
          <p>
            {actorName} {eventName} the document{" "}
            <a href={link}>{document.title}</a>, in the {collectionName}{" "}
            collection.
          </p>
          {body && (
            <>
              <EmptySpace height={20} />
              <Diff>
                <div dangerouslySetInnerHTML={{ __html: body }} />
              </Diff>
              <EmptySpace height={20} />
            </>
          )}
          <p>
            <Button href={link}>Open Document</Button>
          </p>
        </Body>

        <Footer unsubscribeUrl={unsubscribeUrl} />
      </EmailTemplate>
    );
  }
}
