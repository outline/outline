import inlineCss from "inline-css";
import * as React from "react";
import env from "@server/env";
import { Document } from "@server/models";
import BaseEmail from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import Diff from "./components/Diff";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type InputProps = {
  to: string;
  documentId: string;
  actorName: string;
  isReply: boolean;
  collectionName: string;
  teamUrl: string;
  unsubscribeUrl: string;
  content: string;
};

type BeforeSend = {
  document: Document;
  body: string | undefined;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when they are subscribed to a document and a new comment
 * is created.
 */
export default class CommentCreatedEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected async beforeSend({ documentId, content }: InputProps) {
    const document = await Document.unscoped().findByPk(documentId);
    if (!document) {
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

    return { document, body };
  }

  protected subject({ isReply, actorName, document }: Props) {
    return isReply
      ? `${actorName} replied in “${document.title}”`
      : `New comment on “${document.title}”`;
  }

  protected preview({ isReply, actorName }: Props): string {
    return isReply
      ? `${actorName} replied in a thread`
      : `${actorName} commented on the document`;
  }

  protected renderAsText({
    actorName,
    teamUrl,
    isReply,
    document,
    collectionName,
  }: Props): string {
    return `
${actorName} ${isReply ? "replied in" : "commented on"} the document "${
      document.title
    }", in the ${collectionName} collection.

Open Document: ${teamUrl}${document.url}
`;
  }

  protected render({
    document,
    actorName,
    isReply,
    collectionName,
    teamUrl,
    unsubscribeUrl,
    body,
  }: Props) {
    const link = `${teamUrl}${document.url}?ref=notification-email`;

    return (
      <EmailTemplate>
        <Header />

        <Body>
          <Heading>{document.title}</Heading>
          <p>
            {actorName} {isReply ? "replied in" : "commented on"} the document{" "}
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
            <Button href={link}>Open Thread</Button>
          </p>
        </Body>

        <Footer unsubscribeUrl={unsubscribeUrl} />
      </EmailTemplate>
    );
  }
}
