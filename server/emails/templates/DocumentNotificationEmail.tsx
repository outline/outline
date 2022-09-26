import { JSDOM } from "jsdom";
import * as React from "react";
import { Document } from "@server/models";
import BaseEmail from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import Diff from "./components/Diff";
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
  content: string;
};

type BeforeSend = {
  document: Document;
  css: string | undefined;
  body: string | undefined;
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
  protected async beforeSend({ documentId, content }: InputProps) {
    const document = await Document.unscoped().findByPk(documentId);
    if (!document) {
      return false;
    }

    // extract the css styles so they can be injected into the head of email
    // for best compatability
    let css, body;
    if (content) {
      const dom = new JSDOM(content);
      const styles = dom.window.document.querySelectorAll("style");
      css = Array.from(styles)
        .map((style) => style.innerHTML)
        .join(" ");

      styles.forEach((style) => style.remove());
      body = dom.window.document.body.innerHTML;
    }

    return { document, body, css };
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

  protected headCSS(props: Props) {
    return props.css;
  }

  protected render({
    document,
    actorName,
    collectionName,
    eventName = "published",
    teamUrl,
    unsubscribeUrl,
    body,
  }: Props) {
    const link = `${teamUrl}${document.url}?ref=notification-email`;

    return (
      <EmailTemplate>
        <Header />

        <Body>
          <Heading>
            “{document.title}” {eventName}
          </Heading>
          <p>
            {actorName} {eventName} the document{" "}
            <a href={link}>{document.title}</a>, in the {collectionName}{" "}
            collection.
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
            <Button href={link}>Open Document</Button>
          </p>
        </Body>

        <Footer unsubscribeUrl={unsubscribeUrl} />
      </EmailTemplate>
    );
  }
}
