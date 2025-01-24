import * as React from "react";
import { NotificationEventType } from "@shared/types";
import { Collection, Comment, Document } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { can } from "@server/policies";
import BaseEmail, { EmailMessageCategory, EmailProps } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import Diff from "./components/Diff";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

const MAX_SUBJECT_CONTENT = 50;

type InputProps = EmailProps & {
  userId: string;
  documentId: string;
  actorName: string;
  commentId: string;
  teamUrl: string;
};

type BeforeSend = {
  comment: Comment;
  parentComment?: Comment;
  document: Document;
  collection: Collection | null;
  body: string | undefined;
  isReply: boolean;
  unsubscribeUrl: string;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when a new comment is created in a document they are
 * subscribed to.
 */
export default class CommentCreatedEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected async beforeSend(props: InputProps) {
    const { documentId, commentId } = props;
    const document = await Document.unscoped().findByPk(documentId);
    if (!document) {
      return false;
    }

    const [comment, team, collection] = await Promise.all([
      Comment.findByPk(commentId),
      document.$get("team"),
      document.$get("collection"),
    ]);
    if (!comment || !team) {
      return false;
    }

    const parentComment = comment.parentCommentId
      ? (await comment.$get("parentComment")) ?? undefined
      : undefined;

    const body = await this.htmlForData(
      team,
      ProsemirrorHelper.toProsemirror(comment.data)
    );
    const isReply = !!comment.parentCommentId;

    return {
      comment,
      parentComment,
      document,
      collection,
      isReply,
      body,
      unsubscribeUrl: this.unsubscribeUrl(props),
    };
  }

  protected unsubscribeUrl({ userId }: InputProps) {
    return NotificationSettingsHelper.unsubscribeUrl(
      userId,
      NotificationEventType.CreateComment
    );
  }

  protected subject({ comment, parentComment, document }: Props) {
    const commentText = DocumentHelper.toPlainText(
      parentComment?.data ?? comment.data
    );
    const trimmedText =
      commentText.length <= MAX_SUBJECT_CONTENT
        ? commentText
        : `${commentText.slice(0, MAX_SUBJECT_CONTENT)}...`;

    return `${parentComment ? "Re: " : ""}New comment on “${
      document.titleWithDefault
    }” - ${trimmedText}`;
  }

  protected preview({ isReply, actorName }: Props): string {
    return isReply
      ? `${actorName} replied in a thread`
      : `${actorName} commented on the document`;
  }

  protected fromName({ actorName }: Props): string {
    return actorName;
  }

  protected replyTo({ notification }: Props) {
    if (notification?.user && notification.actor?.email) {
      if (can(notification.user, "readEmail", notification.actor)) {
        return notification.actor.email;
      }
    }
    return;
  }

  protected renderAsText({
    actorName,
    teamUrl,
    isReply,
    document,
    commentId,
    collection,
  }: Props): string {
    return `
${actorName} ${isReply ? "replied to a thread in" : "commented on"} "${
      document.titleWithDefault
    }"${collection?.name ? `in the ${collection.name} collection` : ""}.

Open Thread: ${teamUrl}${document.url}?commentId=${commentId}
`;
  }

  protected render(props: Props) {
    const {
      document,
      actorName,
      isReply,
      collection,
      teamUrl,
      commentId,
      unsubscribeUrl,
      body,
    } = props;
    const threadLink = `${teamUrl}${document.url}?commentId=${commentId}&ref=notification-email`;

    return (
      <EmailTemplate
        previewText={this.preview(props)}
        goToAction={{ url: threadLink, name: "View Thread" }}
      >
        <Header />

        <Body>
          <Heading>{document.titleWithDefault}</Heading>
          <p>
            {actorName} {isReply ? "replied to a thread in" : "commented on"}{" "}
            <a href={threadLink}>{document.titleWithDefault}</a>{" "}
            {collection?.name ? `in the ${collection.name} collection` : ""}.
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
            <Button href={threadLink}>Open Thread</Button>
          </p>
        </Body>

        <Footer unsubscribeUrl={unsubscribeUrl} />
      </EmailTemplate>
    );
  }
}
