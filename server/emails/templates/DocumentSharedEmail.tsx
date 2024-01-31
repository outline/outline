import * as React from "react";
import { Document } from "@server/models";
import BaseEmail, { EmailProps } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import Header from "./components/Header";
import Heading from "./components/Heading";

type InputProps = EmailProps & {
  documentId: string;
  actorName: string;
  teamUrl: string;
};

type BeforeSend = {
  document: Document;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when someone adds them to a document.
 */
export default class DocumentSharedEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected async beforeSend({ documentId }: InputProps) {
    const document = await Document.unscoped().findByPk(documentId);
    if (!document) {
      return false;
    }

    return { document };
  }

  protected subject({ actorName, document }: Props) {
    return `${actorName} shared “${document.title}” with you`;
  }

  protected preview({ actorName }: Props): string {
    return `${actorName} shared a document`;
  }

  protected fromName({ actorName }: Props) {
    return actorName;
  }

  protected renderAsText({ actorName, teamUrl, document }: Props): string {
    return `
${actorName} shared “${document.title}” with you.

View Document: ${teamUrl}${document.path}
`;
  }

  protected render(props: Props) {
    const { document, actorName, teamUrl } = props;
    const documentLink = `${teamUrl}${document.url}?ref=notification-email`;

    return (
      <EmailTemplate
        previewText={this.preview(props)}
        goToAction={{ url: documentLink, name: "View Document" }}
      >
        <Header />

        <Body>
          <Heading>{document.title}</Heading>
          <p>{actorName} shared this document with you.</p>
          <p>
            <Button href={documentLink}>View Document</Button>
          </p>
        </Body>
      </EmailTemplate>
    );
  }
}
