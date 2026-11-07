import { NotificationEventType } from "@shared/types";
import { Document } from "@server/models";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import type { EmailProps } from "./BaseEmail";
import BaseEmail, { EmailMessageCategory } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type InputProps = EmailProps & {
  userId: string;
  documentId: string;
  actorName: string;
  teamUrl: string;
};

type BeforeSend = {
  document: Document;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when someone makes them an owner of a document.
 */
export default class DocumentOwnerAddedEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected async beforeSend({ documentId, userId }: InputProps) {
    const document = await Document.unscoped().findByPk(documentId);
    if (!document || !document.ownerIds?.includes(userId)) {
      return false;
    }

    return { document };
  }

  protected unsubscribeUrl({ userId }: InputProps) {
    return NotificationSettingsHelper.unsubscribeUrl(
      userId,
      NotificationEventType.AddOwnerToDocument
    );
  }

  protected subject({ actorName, document }: Props) {
    return this.t(
      `{{ actorName }} made you an owner of “{{ documentTitle }}”`,
      {
        actorName,
        documentTitle: document.displayTitle,
      }
    );
  }

  protected preview({ actorName }: Props): string {
    return this.t("{{ actorName }} made you an owner of a document", {
      actorName,
    });
  }

  protected fromName({ actorName }: Props) {
    return actorName;
  }

  protected renderAsText({ actorName, teamUrl, document }: Props): string {
    return `
${this.t(`{{ actorName }} made you an owner of “{{ documentTitle }}”.`, { actorName, documentTitle: document.displayTitle })}

${this.t("View Document")}: ${teamUrl}${document.path}
`;
  }

  protected render(props: Props) {
    const { document, actorName, teamUrl } = props;
    const documentUrl = `${teamUrl}${document.path}?ref=notification-email`;

    return (
      <EmailTemplate
        previewText={this.preview(props)}
        goToAction={{ url: documentUrl, name: this.t("View Document") }}
      >
        <Header />

        <Body>
          <Heading>{document.displayTitle}</Heading>
          <p>
            {this.t("{{ actorName }} made you an owner of the", {
              actorName,
            })}{" "}
            <a href={documentUrl}>{document.displayTitle}</a>{" "}
            {this.t("document")}.
          </p>
          <p>
            <Button href={documentUrl}>{this.t("View Document")}</Button>
          </p>
        </Body>

        <Footer
          unsubscribeUrl={this.unsubscribeUrl(props)}
          unsubscribeText={this.t("Unsubscribe from these emails")}
        />
      </EmailTemplate>
    );
  }
}
