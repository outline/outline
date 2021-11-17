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
  // @ts-expect-error ts-migrate(2749) FIXME: 'User' refers to a value, but is being used as a t... Remove this comment to see the full error message
  actor: User;
  // @ts-expect-error ts-migrate(2749) FIXME: 'Team' refers to a value, but is being used as a t... Remove this comment to see the full error message
  team: Team;
  document: any;
  // @ts-expect-error ts-migrate(2749) FIXME: 'Collection' refers to a value, but is being used ... Remove this comment to see the full error message
  collection: Collection;
  eventName: string;
  unsubscribeUrl: string;
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
