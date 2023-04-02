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
  commentId: string;
  collectionName: string | undefined;
  teamUrl: string;
  content: string;
};

type BeforeSend = {
  document: Document;
  body: string | undefined;
  unsubscribeUrl: string;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when a new comment is created in a document they are
 * subscribed to.
 */
export default class CommentMentionedEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected async beforeSend({ documentId, userId, content }: InputProps) {
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
        NotificationEventType.Mentioned
      ),
    };
  }

  protected subject({ actorName, document }: Props) {
    return `${actorName} mentioned you in “${document.title}”`;
  }

  protected preview({ actorName }: Props): string {
    return `${actorName} mentioned you in a thread`;
  }

  protected fromName({ actorName }: Props): string {
    return actorName;
  }

  protected renderAsText({
    actorName,
    teamUrl,
    document,
    commentId,
    collectionName,
  }: Props): string {
    return `
${actorName} mentioned you in a comment on "${document.title}"${
      collectionName ? `in the ${collectionName} collection` : ""
    }.

Open Thread: ${teamUrl}${document.url}?commentId=${commentId}
`;
  }

  protected render({
    document,
    actorName,
    collectionName,
    teamUrl,
    commentId,
    unsubscribeUrl,
    body,
  }: Props) {
    const link = `${teamUrl}${document.url}?commentId=${commentId}&ref=notification-email`;

    return (
      <EmailTemplate>
        <Header />

        <Body>
          <Heading>{document.title}</Heading>
          <p>
            {actorName} mentioned you in a comment on{" "}
            <a href={link}>{document.title}</a>{" "}
            {collectionName ? `in the ${collectionName} collection` : ""}.
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
