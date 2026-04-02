import * as React from "react";
import { ShareSubscription } from "@server/models";
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
};

type BeforeSend = {
  unsubscribeUrl: string;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a share subscriber when the shared document is updated.
 */
export default class ShareDocumentUpdatedEmail extends BaseEmail<
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

    return {
      unsubscribeUrl: ShareSubscriptionHelper.unsubscribeUrl(subscription),
    };
  }

  protected unsubscribeUrl({ unsubscribeUrl }: Props) {
    return unsubscribeUrl;
  }

  protected subject({ documentTitle }: Props) {
    return this.t(`"{{ documentTitle }}" updated`, { documentTitle });
  }

  protected preview({ documentTitle }: Props): string {
    return this.t('"{{ documentTitle }}" has been updated.', { documentTitle });
  }

  protected renderAsText({ documentTitle, shareUrl }: Props): string {
    return `
${this.t(`"{{ documentTitle }}" updated`, { documentTitle })}

${this.t("A document you subscribed to has been updated.")}

${this.t("View Document")}: ${shareUrl}
`;
  }

  protected render({ documentTitle, shareUrl, unsubscribeUrl }: Props) {
    const documentLink = `${shareUrl}?ref=subscription-email`;

    return (
      <EmailTemplate
        previewText={this.preview({ documentTitle } as Props)}
        goToAction={{ url: documentLink, name: this.t("View Document") }}
      >
        <Header />

        <Body>
          <Heading>
            {this.t(`"{{ documentTitle }}" updated`, { documentTitle })}
          </Heading>
          <p>
            {this.t("A document you subscribed to has been updated.")}{" "}
            {this.t("Click below to view the latest version.")}
          </p>
          <EmptySpace height={10} />
          <p>
            <Button href={documentLink}>{this.t("View Document")}</Button>
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
