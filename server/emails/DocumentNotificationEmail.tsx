import * as React from "react";
import { Document } from "@server/models";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

export type Props = {
  document: Document;
  actorName: string;
  collectionName: string;
  eventName: string;
  teamUrl: string;
  unsubscribeUrl: string;
};

export const documentNotificationEmailText = ({
  actorName,
  teamUrl,
  document,
  collectionName,
  eventName = "published",
}: Props) => `
"${document.title}" ${eventName}

${actorName} ${eventName} the document "${document.title}", in the ${collectionName} collection.

Open Document: ${teamUrl}${document.url}
`;

export const DocumentNotificationEmail = ({
  document,
  actorName,
  collectionName,
  eventName = "published",
  teamUrl,
  unsubscribeUrl,
}: Props) => {
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
};
