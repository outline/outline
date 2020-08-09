// @flow
import * as React from "react";
import { User, Document, Team, Collection } from "../models";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

export type Props = {
  actor: User,
  team: Team,
  document: Document,
  collection: Collection,
  eventName: string,
  unsubscribeUrl: string,
};

export const documentNotificationEmailText = ({
  actor,
  team,
  document,
  collection,
  eventName = "published",
}: Props) => `
"${document.title}" ${eventName}

${actor.name} ${eventName} the document "${document.title}", in the ${collection.name} collection.

Open Document: ${team.url}${document.url}
`;

export const DocumentNotificationEmail = ({
  actor,
  team,
  document,
  collection,
  eventName = "published",
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
          {actor.name} {eventName} the document "{document.title}", in the{" "}
          {collection.name} collection.
        </p>
        <hr />
        <EmptySpace height={10} />
        <p>{document.getSummary()}</p>
        <EmptySpace height={10} />
        <p>
          <Button href={`${team.url}${document.url}`}>Open Document</Button>
        </p>
      </Body>

      <Footer unsubscribeUrl={unsubscribeUrl} />
    </EmailTemplate>
  );
};
