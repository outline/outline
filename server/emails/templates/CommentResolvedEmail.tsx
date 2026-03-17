import * as React from "react";
import { NotificationEventType } from "@shared/types";
import type { Collection } from "@server/models";
import { Comment, Document } from "@server/models";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { can } from "@server/policies";
import type { EmailProps } from "./BaseEmail";
import BaseEmail, { EmailMessageCategory } from "./BaseEmail";
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
  teamUrl: string;
};

type BeforeSend = {
  document: Document;
  collection: Collection;
  body: string | undefined;
  unsubscribeUrl: string;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when a comment they are involved in was resolved.
 */
export default class CommentResolvedEmail extends BaseEmail<
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
      unsubscribeUrl: this.unsubscribeUrl(props),
    };
  }

  protected unsubscribeUrl({ userId }: InputProps) {
    return NotificationSettingsHelper.unsubscribeUrl(
      userId,
      NotificationEventType.ResolveComment
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

  protected subject({ document }: Props) {
    return this.t("Resolved a comment thread in “{{ documentTitle }}”", {
      documentTitle: document.titleWithDefault,
    });
  }

  protected preview({ actorName }: Props): string {
    return this.t("{{ actorName }} resolved a comment thread", { actorName });
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
  }: Props): string {
    const action = this.t(
      "{{ actorName }} resolved a comment thread on “{{ documentTitle }}”",
      { actorName, documentTitle: document.titleWithDefault }
    );
    const inCollection = collection.name
      ? ` ${this.t("in the {{ collectionName }} collection", { collectionName: collection.name })}`
      : "";
    const openThread = `${this.t("Open Thread")}: ${teamUrl}${document.url}?commentId=${commentId}`;
    return `${action}${inCollection}.\n\n${openThread}`;
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
    } = props;
    const threadLink = `${teamUrl}${document.url}?commentId=${commentId}&ref=notification-email`;

    return (
      <EmailTemplate
        previewText={this.preview(props)}
        goToAction={{ url: threadLink, name: this.t("View Thread") }}
      >
        <Header />

        <Body>
          <Heading>{document.titleWithDefault}</Heading>
          <p>
            {this.t("{{ actorName }} resolved a comment on", { actorName })}{" "}
            <a href={threadLink}>{document.titleWithDefault}</a>{" "}
            {collection.name
              ? this.t("in the {{ collectionName }} collection", {
                  collectionName: collection.name,
                })
              : ""}
            .
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
            <Button href={threadLink}>{this.t("Open Thread")}</Button>
          </p>
        </Body>

        <Footer
          unsubscribeUrl={unsubscribeUrl}
          unsubscribeText={this.t("Unsubscribe from these emails")}
        />
      </EmailTemplate>
    );
  }
}
