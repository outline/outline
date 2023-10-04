import inlineCss from "inline-css";
import * as React from "react";
import { NotificationEventType } from "@shared/types";
import { Day } from "@shared/utils/time";
import env from "@server/env";
import { Collection, Comment, Document } from "@server/models";
import DocumentHelper from "@server/models/helpers/DocumentHelper";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import ProsemirrorHelper from "@server/models/helpers/ProsemirrorHelper";
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
 * Email sent to a user when a new comment is created in a document they are
 * subscribed to.
 */
export default class CommentMentionedEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
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

    const comment = await Comment.findByPk(commentId);
    if (!comment) {
      return false;
    }

    let body;
    let content = ProsemirrorHelper.toHTML(
      ProsemirrorHelper.toProsemirror(comment.data),
      {
        centered: false,
      }
    );

    content = await DocumentHelper.attachmentsToSignedUrls(
      content,
      document.teamId,
      (4 * Day) / 1000
    );

    if (content) {
      // inline all css so that it works in as many email providers as possible.
      body = await inlineCss(content, {
        url: env.URL,
        applyStyleTags: true,
        applyLinkTags: false,
        removeStyleTags: true,
      });
    }

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
      NotificationEventType.MentionedInComment
    );
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
    collection,
  }: Props): string {
    return `
${actorName} mentioned you in a comment on "${document.title}"${
      collection.name ? `in the ${collection.name} collection` : ""
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
    } = props;
    const threadLink = `${teamUrl}${document.url}?commentId=${commentId}&ref=notification-email`;

    return (
      <EmailTemplate
        previewText={this.preview(props)}
        goToAction={{ url: threadLink, name: "View Thread" }}
      >
        <Header />

        <Body>
          <Heading>{document.title}</Heading>
          <p>
            {actorName} mentioned you in a comment on{" "}
            <a href={threadLink}>{document.title}</a>{" "}
            {collection.name ? `in the ${collection.name} collection` : ""}.
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
