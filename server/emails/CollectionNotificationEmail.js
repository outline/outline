// @flow
import * as React from 'react';
import { User, Collection } from '../models';
import EmailTemplate from './components/EmailLayout';
import Body from './components/Body';
import Button from './components/Button';
import Heading from './components/Heading';
import Header from './components/Header';
import Footer from './components/Footer';
import EmptySpace from './components/EmptySpace';

export type Props = {
  actor: User,
  collection: Collection,
  eventName: string,
};

export const collectionNotificationEmailText = ({
  actor,
  collection,
  eventName = 'created',
}: Props) => `
"${document.title}" ${eventName}

${actor.name} ${eventName} the collection "${collection.name}"

Open Collection: ${process.env.URL}${collection.url}
`;

export const CollectionNotificationEmail = ({
  actor,
  collection,
  eventName = 'created',
}: Props) => {
  return (
    <EmailTemplate>
      <Header />

      <Body>
        <Heading>
          "{collection.name}" {eventName}
        </Heading>
        <p>
          {actor.name} {eventName} the collection "{collection.title}".
        </p>
        <EmptySpace height={10} />
        <p>
          <Button href={`${process.env.URL}${collection.url}`}>
            Open Collection
          </Button>
        </p>
      </Body>

      <Footer />
    </EmailTemplate>
  );
};
