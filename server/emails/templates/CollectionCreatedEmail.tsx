import * as React from "react";
import { NotificationEventType } from "@shared/types";
import { Collection } from "@server/models";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import type { EmailProps } from "./BaseEmail";
import BaseEmail, { EmailMessageCategory } from "./BaseEmail";
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
    const collection = await Collection.findByPk(props.collectionId, {
      includeOwner: true,
    });

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
    return this.t("“{{ collectionName }}” created", {
      collectionName: collection.name,
    });
  }

  protected preview({ collection }: Props) {
    return this.t("{{ userName }} created a collection", {
      userName: collection.user.name,
    });
  }

  protected renderAsText({ teamUrl, collection }: Props) {
    return `
${collection.name}

${this.t("{{ userName }} created the collection “{{ collectionName }}”", { userName: collection.user.name, collectionName: collection.name })}

${this.t("Open Collection")}: ${teamUrl}${collection.path}
`;
  }

  protected render(props: Props) {
    const { collection, teamUrl, unsubscribeUrl } = props;
    const collectionLink = `${teamUrl}${collection.path}`;

    return (
      <EmailTemplate
        previewText={this.preview(props)}
        goToAction={{
          url: collectionLink,
          name: this.t("View Collection"),
        }}
      >
        <Header />

        <Body>
          <Heading>{collection.name}</Heading>
          <p>
            {this.t(
              "{{ userName }} created the collection “{{ collectionName }}”.",
              {
                userName: collection.user.name,
                collectionName: collection.name,
              }
            )}
          </p>
          <EmptySpace height={10} />
          <p>
            <Button href={collectionLink}>{this.t("Open Collection")}</Button>
          </p>
        </Body>

        <Footer
          unsubscribeUrl={unsubscribeUrl}
          unsubscribeText={this.t("Unsubscribe from these emails")}
        />
      </EmailTemplate>
    );
  }
}
