import * as React from "react";
import { Comment, ShareSubscription } from "@server/models";
import ShareSubscriptionHelper from "@server/models/helpers/ShareSubscriptionHelper";
import type { EmailProps } from "./BaseEmail";
import BaseEmail, { EmailMessageCategory } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type InputProps = EmailProps & {
  shareSubscriptionId: string;
  documentTitle: string;
  shareUrl: string;
  commentId: string;
};

type BeforeSend = {
  unsubscribeUrl: string;
  authorName: string;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a confirmed guest subscriber when a new comment is left in a
 * thread they previously commented in, on a publicly shared document. No
 * private data — such as a team member's email address — is ever included.
 */
export default class ShareCommentCreatedEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected async beforeSend(props: InputProps) {
    const subscription = await ShareSubscription.findByPk(
      props.shareSubscriptionId
    );

    if (
      !subscription ||
      subscription.isUnsubscribed ||
      !subscription.isConfirmed
    ) {
      return false;
    }

    const comment = await Comment.findByPk(props.commentId);
    if (!comment) {
      return false;
    }

    return {
      unsubscribeUrl: ShareSubscriptionHelper.unsubscribeUrl(subscription),
      authorName:
        comment.guestName ?? comment.createdBy?.name ?? this.t("Someone"),
    };
  }

  protected unsubscribeUrl({ unsubscribeUrl }: Props) {
    return unsubscribeUrl;
  }

  protected subject({ documentTitle }: Props) {
    return this.t('New comment on "{{ documentTitle }}"', { documentTitle });
  }

  protected preview({ authorName, documentTitle }: Props): string {
    return this.t('{{ authorName }} commented on "{{ documentTitle }}"', {
      authorName,
      documentTitle,
    });
  }

  protected renderAsText({
    authorName,
    documentTitle,
    shareUrl,
    commentId,
  }: Props): string {
    return `
${this.t('{{ authorName }} commented on "{{ documentTitle }}"', {
  authorName,
  documentTitle,
})}

${this.t("View Comment")}: ${shareUrl}?commentId=${commentId}
`;
  }

  protected render(props: Props) {
    const { authorName, documentTitle, shareUrl, commentId, unsubscribeUrl } =
      props;
    const commentLink = `${shareUrl}?commentId=${commentId}&ref=comment-notification-email`;

    return (
      <EmailTemplate
        previewText={this.preview(props)}
        goToAction={{ url: commentLink, name: this.t("View Comment") }}
      >
        <Header />

        <Body>
          <Heading>{documentTitle}</Heading>
          <p>
            {this.t("{{ authorName }} left a new comment on", { authorName })}{" "}
            <a href={commentLink}>{documentTitle}</a>.
          </p>
          <EmptySpace height={10} />
          <p>
            <Button href={commentLink}>{this.t("View Comment")}</Button>
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
