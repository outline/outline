import { NotificationEventType } from "@shared/types";
import { Collection } from "@server/models";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import type { EmailProps } from "./BaseEmail";
import BaseEmail, { EmailMessageCategory } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type InputProps = EmailProps & {
  userId: string;
  collectionId: string;
  actorName: string;
  teamUrl: string;
};

type BeforeSend = {
  collection: Collection;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when someone makes them an owner of a collection.
 */
export default class CollectionOwnerAddedEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected async beforeSend({ collectionId, userId }: InputProps) {
    const collection = await Collection.findByPk(collectionId);
    if (!collection || !collection.ownerIds?.includes(userId)) {
      return false;
    }

    return { collection };
  }

  protected unsubscribeUrl({ userId }: InputProps) {
    return NotificationSettingsHelper.unsubscribeUrl(
      userId,
      NotificationEventType.AddOwnerToCollection
    );
  }

  protected subject({ actorName, collection }: Props) {
    return this.t(
      "{{ actorName }} made you an owner of the “{{ collectionName }}” collection",
      { actorName, collectionName: collection.name }
    );
  }

  protected preview({ actorName }: Props): string {
    return this.t("{{ actorName }} made you an owner of a collection", {
      actorName,
    });
  }

  protected fromName({ actorName }: Props) {
    return actorName;
  }

  protected renderAsText({ actorName, teamUrl, collection }: Props): string {
    return `
${this.t("{{ actorName }} made you an owner of the “{{ collectionName }}” collection.", { actorName, collectionName: collection.name })}

${this.t("View Collection")}: ${teamUrl}${collection.path}
`;
  }

  protected render(props: Props) {
    const { collection, actorName, teamUrl } = props;
    const collectionUrl = `${teamUrl}${collection.path}?ref=notification-email`;

    return (
      <EmailTemplate
        previewText={this.preview(props)}
        goToAction={{
          url: collectionUrl,
          name: this.t("View Collection"),
        }}
      >
        <Header />

        <Body>
          <Heading>{collection.name}</Heading>
          <p>
            {this.t("{{ actorName }} made you an owner of the", {
              actorName,
            })}{" "}
            <a href={collectionUrl}>{collection.name}</a> {this.t("collection")}
            .
          </p>
          <p>
            <Button href={collectionUrl}>{this.t("View Collection")}</Button>
          </p>
        </Body>

        <Footer
          unsubscribeUrl={this.unsubscribeUrl(props)}
          unsubscribeText={this.t("Unsubscribe from these emails")}
        />
      </EmailTemplate>
    );
  }
}
