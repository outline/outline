import * as React from "react";
import type { Collection } from "@server/models";
import { Document } from "@server/models";
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
  ownerName: string;
  ownerEmail: string;
  teamUrl: string;
  message?: string | null;
};

type BeforeSend = {
  document: Document;
  collection: Collection | null;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to an editor as a reminder about a document update.
 */
export default class DocumentReminderEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected async beforeSend(props: InputProps) {
    const { documentId } = props;
    const document = await Document.unscoped().findByPk(documentId, {
      includeState: true,
    });
    if (!document) {
      return false;
    }

    const collection = await document.$get("collection");

    return {
      document,
      collection,
    };
  }

  protected subject({ document, ownerName }: Props) {
    return `Напоминание: "${document.titleWithDefault}" от ${ownerName}`;
  }

  protected preview({ ownerName }: Props): string {
    return `${ownerName} напоминает вам об обновлении документа`;
  }

  protected fromName({ ownerName }: Props) {
    return ownerName;
  }

  protected replyTo({ ownerEmail }: InputProps) {
    return ownerEmail;
  }

  protected renderAsText({
    ownerName,
    teamUrl,
    document,
    collection,
    message,
  }: Props): string {
    return `
Напоминание от ${ownerName}

${ownerName} напоминает вам об обновлении документа "${document.titleWithDefault}"${
      collection?.name ? `, в коллекции ${collection.name}` : ""
    }.

${message ? `Сообщение: ${message}\n\n` : ""}
Открыть документ: ${teamUrl}${document.url}
`;
  }

  protected render(props: Props) {
    const {
      document,
      ownerName,
      collection,
      teamUrl,
      message,
    } = props;
    const documentLink = `${teamUrl}${document.url}?ref=reminder-email`;

    return (
      <EmailTemplate
        previewText={this.preview(props)}
        goToAction={{ url: documentLink, name: "Открыть документ" }}
      >
        <Header />

        <Body>
          <Heading>
            Напоминание от {ownerName}
          </Heading>
          <p>
            {ownerName} напоминает вам об обновлении документа{" "}
            <a href={documentLink}>{document.titleWithDefault}</a>
            {collection?.name ? <>, в коллекции {collection.name}</> : ""}
            .
          </p>
          {message && (
            <>
              <EmptySpace height={20} />
              <p style={{ fontStyle: "italic", color: "#666" }}>
                {message}
              </p>
              <EmptySpace height={20} />
            </>
          )}
          <p>
            <Button href={documentLink}>Открыть документ</Button>
          </p>
        </Body>

        <Footer />
      </EmailTemplate>
    );
  }
}
