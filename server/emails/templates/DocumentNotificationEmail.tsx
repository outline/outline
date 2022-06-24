import invariant from "invariant";
import * as React from "react";
import { Document } from "@server/models";
import BaseEmail from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type InputProps = {
  to: string;
  documentId: string;
  actorName: string;
  collectionName: string;
  eventName: string;
  teamUrl: string;
  unsubscribeUrl: string;
};

type BeforeSend = {
  document: Document;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when they have enabled document notifications, the event
 * may be published or updated.
 */
export default class DocumentNotificationEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected async beforeSend({ documentId }: InputProps) {
    const document = await Document.unscoped().findByPk(documentId);
    invariant(document, "Document not found");
    return { document };
  }

  protected subject({ document, eventName }: Props) {
    return `“${document.title}” ${eventName}`;
  }

  protected preview({ actorName, eventName }: Props): string {
    return `${actorName} ${eventName} a document`;
  }

  protected renderAsText({
    actorName,
    teamUrl,
    document,
    collectionName,
    eventName = "published",
  }: Props): string {
    return `
"${document.title}" ${eventName}

${actorName} ${eventName} the document "${document.title}", in the ${collectionName} collection.

Open Document: ${teamUrl}${document.url}
`;
  }

  protected render({
    document,
    actorName,
    collectionName,
    eventName = "published",
    teamUrl,
    unsubscribeUrl,
  }: Props) {
    return (
      <EmailTemplate>
        <Header />

        <Body>
          <Heading>
            "{document.title}" {eventName}
          </Heading>
          <p>
            {actorName} {eventName} the document "{document.title}", in the{" "}
            {collectionName} collection.
          </p>
          <hr />
          <EmptySpace height={10} />
          <p>{document.getSummary()}</p>
          <EmptySpace height={10} />
          <p>
            <Button href={`${teamUrl}${document.url}`}>Open Document</Button>
          </p>
        </Body>

        <Footer unsubscribeUrl={unsubscribeUrl} />
      </EmailTemplate>
    );
  }
}
