import * as React from "react";
import { User, Collection } from "../models";
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
  // @ts-expect-error ts-migrate(2749) FIXME: 'Collection' refers to a value, but is being used ... Remove this comment to see the full error message
  collection: Collection;
  eventName: string;
  unsubscribeUrl: string;
};

export const collectionNotificationEmailText = ({
  actor,
  collection,
  eventName = "created",
}: Props) => `
${collection.name}

${actor.name} ${eventName} the collection "${collection.name}"

Open Collection: ${process.env.URL}${collection.url}
`;

export const CollectionNotificationEmail = ({
  actor,
  collection,
  eventName = "created",
  unsubscribeUrl,
}: Props) => {
  return (
    <EmailTemplate>
      <Header />

      <Body>
        <Heading>{collection.name}</Heading>
        <p>
          {actor.name} {eventName} the collection "{collection.name}".
        </p>
        <EmptySpace height={10} />
        <p>
          <Button href={`${process.env.URL}${collection.url}`}>
            Open Collection
          </Button>
        </p>
      </Body>

      <Footer unsubscribeUrl={unsubscribeUrl} />
    </EmailTemplate>
  );
};
