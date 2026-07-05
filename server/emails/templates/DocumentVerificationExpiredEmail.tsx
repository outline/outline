import * as React from "react";
import { NotificationEventType } from "@shared/types";
import { Document } from "@server/models";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
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
  userId: string;
  documentId: string;
  teamUrl: string;
};

type BeforeSend = {
  document: Document;
  unsubscribeUrl: string;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to the verifier of a document when their verification has
 * expired and the document is due to be reviewed again.
 */
export default class DocumentVerificationExpiredEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected async beforeSend(props: InputProps) {
    const document = await Document.unscoped().findByPk(props.documentId);
    if (!document) {
      return false;
    }

    return {
      document,
      unsubscribeUrl: this.unsubscribeUrl(props),
    };
  }

  protected unsubscribeUrl({ userId }: InputProps) {
    return NotificationSettingsHelper.unsubscribeUrl(
      userId,
      NotificationEventType.VerificationExpired
    );
  }

  protected subject({ document }: Props) {
    return this.t("Your verification of “{{ documentTitle }}” has expired", {
      documentTitle: document.titleWithDefault,
    });
  }

  protected preview({ document }: Props): string {
    return this.t("“{{ documentTitle }}” is due to be reviewed again", {
      documentTitle: document.titleWithDefault,
    });
  }

  protected renderAsText({ teamUrl, document }: Props): string {
    return `
${this.t("Your verification of “{{ documentTitle }}” has expired", { documentTitle: document.titleWithDefault })}

${this.t(
  "You previously verified this document as accurate. That verification has now lapsed – please review the content and verify it again if it is still correct."
)}

${this.t("Open Document")}: ${teamUrl}${document.url}
`;
  }

  protected render(props: Props) {
    const { document, teamUrl, unsubscribeUrl } = props;
    const documentLink = `${teamUrl}${document.url}?ref=notification-email`;

    return (
      <EmailTemplate
        previewText={this.preview(props)}
        goToAction={{ url: documentLink, name: this.t("View Document") }}
      >
        <Header />

        <Body>
          <Heading>
            {this.t("Your verification of “{{ documentTitle }}” has expired", {
              documentTitle: document.titleWithDefault,
            })}
          </Heading>
          <p>
            {this.t(
              "You previously verified the document as accurate. That verification has now lapsed – please review the content and verify it again if it is still correct."
            )}
          </p>
          <EmptySpace height={10} />
          <p>
            <Button href={documentLink}>{this.t("Open Document")}</Button>
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
