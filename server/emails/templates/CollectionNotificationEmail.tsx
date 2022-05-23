import invariant from "invariant";
import * as React from "react";
import env from "@server/env";
import { Collection } from "@server/models";
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
  eventName: string;
  collectionId: string;
  unsubscribeUrl: string;
};

type BeforeSend = {
  collection: Collection;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when they have enabled notifications of new collection
 * creation.
 */

export default class CollectionNotificationEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected async beforeSend({ collectionId }: Props) {
    const collection = await Collection.scope("withUser").findByPk(
      collectionId
    );
    invariant(collection, "Collection not found");
    return { collection };
  }

  protected subject({ collection, eventName }: Props) {
    return `“${collection.name}” ${eventName}`;
  }

  protected preview({ collection, eventName }: Props) {
    return `${collection.user.name} ${eventName} a collection`;
  }

  protected renderAsText({ collection, eventName = "created" }: Props) {
    return `
${collection.name}

${collection.user.name} ${eventName} the collection "${collection.name}"

Open Collection: ${env.URL}${collection.url}
`;
  }

  protected render({
    collection,
    eventName = "created",
    unsubscribeUrl,
  }: Props) {
    return (
      <EmailTemplate>
        <Header />

        <Body>
          <Heading>{collection.name}</Heading>
          <p>
            {collection.user.name} {eventName} the collection "{collection.name}
            ".
          </p>
          <EmptySpace height={10} />
          <p>
            <Button href={`${env.URL}${collection.url}`}>
              Open Collection
            </Button>
          </p>
        </Body>

        <Footer unsubscribeUrl={unsubscribeUrl} />
      </EmailTemplate>
    );
  }
}
