import * as React from "react";
import { NotificationEventType } from "@shared/types";
import { Document, User } from "@server/models";
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
  actorId: string;
  teamUrl: string;
};

type BeforeSend = {
  document: Document;
  actor: User;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to users who can manage a document when someone requests access.
 */
export default class DocumentAccessRequestEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected async beforeSend({ documentId, actorId }: InputProps) {
    const document = await Document.unscoped().findByPk(documentId);
    if (!document) {
      return false;
    }

    const actor = await User.findByPk(actorId);
    if (!actor) {
      return false;
    }

    return { document, actor };
  }

  protected unsubscribeUrl({ userId }: InputProps) {
    return NotificationSettingsHelper.unsubscribeUrl(
      userId,
      NotificationEventType.RequestDocumentAccess
    );
  }

  protected subject({ actor, document }: Props) {
    return this.t(
      "{{ actorName }} is requesting access to “{{ documentTitle }}”",
      { actorName: actor.name, documentTitle: document.displayTitle }
    );
  }

  protected preview({ actor }: Props): string {
    return this.t("{{ actorName }} is requesting access to a document", {
      actorName: actor.name,
    });
  }

  protected fromName({ actor }: Props) {
    return actor.name;
  }

  protected renderAsText({ actor, teamUrl, document }: Props): string {
    return `
${this.t("{{ actorName }} is requesting access to “{{ documentTitle }}”.", { actorName: actor.name, documentTitle: document.displayTitle })}

${this.t("Open the document to share it with them")}: ${teamUrl}${document.path}
`;
  }

  protected render(props: Props) {
    const { document, actor, teamUrl } = props;
    const documentUrl = `${teamUrl}${document.path}?ref=notification-email&notifications=true`;

    return (
      <EmailTemplate
        previewText={this.preview(props)}
        goToAction={{ url: documentUrl, name: this.t("View Document") }}
      >
        <Header />

        <Body>
          <Heading>{document.displayTitle}</Heading>
          <p>
            {this.t("{{ actorName }} is requesting access to the", {
              actorName: actor.name,
            })}{" "}
            <a href={documentUrl}>{document.displayTitle}</a>{" "}
            {this.t("document")}.
          </p>
          <p>{this.t("Open the document to share it with them")}.</p>
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
