import * as React from "react";
import { NotificationEventType } from "@shared/types";
import { Collection, Comment, Document, Group } from "@server/models";
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

type InputProps = EmailProps & {
  groupId: string;
  userId: string;
  documentId: string;
  actorName: string;
  commentId: string;
  teamUrl: string;
};

type BeforeSend = {
  document: Document;
  collection: Collection;
  body: string | undefined;
  unsubscribeUrl: string;
  groupName: string;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when they are a member of a group mentioned in a comment.
 */
export default class GroupCommentMentionedEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected async beforeSend(props: InputProps) {
    const { documentId, commentId, groupId } = props;
    const document = await Document.unscoped().findByPk(documentId);
    if (!document) {
      return false;
    }

    const group = await Group.findByPk(groupId);
    if (!group) {
      return false;
    }

    const collection = await document.$get("collection");
    if (!collection) {
      return false;
    }

    const [comment, team] = await Promise.all([
      Comment.findByPk(commentId),
      document.$get("team"),
    ]);
    if (!comment || !team) {
      return false;
    }

    const body = await this.htmlForData(
      team,
      ProsemirrorHelper.toProsemirror(comment.data)
    );

    return {
      document,
      collection,
      body,
      groupName: group.name,
      unsubscribeUrl: this.unsubscribeUrl(props),
    };
  }

  protected unsubscribeUrl({ userId }: InputProps) {
    return NotificationSettingsHelper.unsubscribeUrl(
      userId,
      NotificationEventType.GroupMentionedInComment
    );
  }

  protected replyTo({ notification }: Props) {
    if (notification?.user && notification.actor?.email) {
      if (can(notification.user, "readEmail", notification.actor)) {
        return notification.actor.email;
      }
    }
    return;
  }

  protected subject({ document, groupName }: Props) {
    return `The ${groupName} group was mentioned in “${document.titleWithDefault}”`;
  }

  protected preview({ actorName, groupName }: Props): string {
    return `${actorName} mentioned the "${groupName}" group in a thread`;
  }

  protected fromName({ actorName }: Props): string {
    return actorName;
  }

  protected renderAsText({
    actorName,
    teamUrl,
    document,
    commentId,
    collection,
    groupName,
  }: Props): string {
    return `
${actorName} mentioned the "${groupName}" group in a comment on "${document.titleWithDefault}"${
      collection.name ? ` in the ${collection.name} collection` : ""
    }.

Open Thread: ${teamUrl}${document.url}?commentId=${commentId}
`;
  }

  protected render(props: Props) {
    const {
      document,
      collection,
      actorName,
      teamUrl,
      commentId,
      unsubscribeUrl,
      body,
      groupName,
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
            {actorName} mentioned the "{groupName}" group in a comment on{" "}
            <a href={threadLink}>{document.titleWithDefault}</a>{" "}
            {collection.name ? ` in the ${collection.name} collection` : ""}.
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
