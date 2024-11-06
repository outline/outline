import * as React from "react";
import { NotificationEventType } from "@shared/types";
import { Collection } from "@server/models";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import BaseEmail, { EmailMessageCategory, EmailProps } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type InputProps = EmailProps & {
  userId: string;
  teamUrl: string;
  collectionId: string;
};

type BeforeSend = {
  collection: Collection;
  unsubscribeUrl: string;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when they have enabled notifications of new collection
 * creation.
 */
export default class CollectionCreatedEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected async beforeSend(props: InputProps) {
    const collection = await Collection.scope("withUser").findByPk(
      props.collectionId
    );
    if (!collection) {
      return false;
    }

    return {
      collection,
      unsubscribeUrl: this.unsubscribeUrl(props),
    };
  }

  protected unsubscribeUrl({ userId }: InputProps) {
    return NotificationSettingsHelper.unsubscribeUrl(
      userId,
      NotificationEventType.CreateCollection
    );
  }

  protected subject({ collection }: Props) {
    return `“${collection.name}” created`;
  }

  protected preview({ collection }: Props) {
    return `${collection.user.name} created a collection`;
  }

  protected renderAsText({ teamUrl, collection }: Props) {
    return `
${collection.name}

${collection.user.name} created the collection "${collection.name}"

Open Collection: ${teamUrl}${collection.url}
`;
  }

  protected render(props: Props) {
    const { collection, teamUrl, unsubscribeUrl } = props;
    const collectionLink = `${teamUrl}${collection.url}`;

    return (
      <EmailTemplate
        previewText={this.preview(props)}
        goToAction={{ url: collectionLink, name: "View Collection" }}
      >
        <Header />

        <Body>
          <Heading>{collection.name}</Heading>
          <p>
            {collection.user.name} created the collection "{collection.name}".
          </p>
          <EmptySpace height={10} />
          <p>
            <Button href={collectionLink}>Open Collection</Button>
          </p>
        </Body>

        <Footer unsubscribeUrl={unsubscribeUrl} />
      </EmailTemplate>
    );
  }
}
