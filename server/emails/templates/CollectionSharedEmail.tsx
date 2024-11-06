import * as React from "react";
import { CollectionPermission } from "@shared/types";
import { Collection, UserMembership } from "@server/models";
import BaseEmail, { EmailMessageCategory, EmailProps } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
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
  membership: UserMembership;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when someone adds them to a collection.
 */
export default class CollectionSharedEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected async beforeSend({ userId, collectionId }: InputProps) {
    const collection = await Collection.findByPk(collectionId);
    if (!collection) {
      return false;
    }

    const membership = await UserMembership.findOne({
      where: {
        collectionId,
        userId,
      },
    });
    if (!membership) {
      return false;
    }

    return { collection, membership };
  }

  protected subject({ actorName, collection }: Props) {
    return `${actorName} invited you to the “${collection.name}” collection`;
  }

  protected preview({ actorName }: Props): string {
    return `${actorName} invited you to a collection`;
  }

  protected fromName({ actorName }: Props) {
    return actorName;
  }

  protected renderAsText({ actorName, teamUrl, collection }: Props): string {
    return `
${actorName} invited you to the “${collection.name}” collection.

View Document: ${teamUrl}${collection.path}
`;
  }

  protected render(props: Props) {
    const { collection, membership, actorName, teamUrl } = props;
    const collectionUrl = `${teamUrl}${collection.path}?ref=notification-email`;

    const permission =
      membership.permission === CollectionPermission.ReadWrite
        ? "view and edit"
        : membership.permission === CollectionPermission.Admin
        ? "manage"
        : "view";

    return (
      <EmailTemplate
        previewText={this.preview(props)}
        goToAction={{ url: collectionUrl, name: "View Collection" }}
      >
        <Header />

        <Body>
          <Heading>{collection.name}</Heading>
          <p>
            {actorName} invited you to {permission} documents in the{" "}
            <a href={collectionUrl}>{collection.name}</a> collection.
          </p>
          <p>
            <Button href={collectionUrl}>View Collection</Button>
          </p>
        </Body>
      </EmailTemplate>
    );
  }
}
