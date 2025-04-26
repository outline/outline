import * as React from "react";
import { NotificationEventType, TeamPreference } from "@shared/types";
import { Day } from "@shared/utils/time";
import { Document, Collection, Revision } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import HTMLHelper from "@server/models/helpers/HTMLHelper";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import SubscriptionHelper from "@server/models/helpers/SubscriptionHelper";
import { can } from "@server/policies";
import { CacheHelper } from "@server/utils/CacheHelper";
import BaseEmail, { EmailMessageCategory, EmailProps } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import Diff from "./components/Diff";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer, { Link } from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type InputProps = EmailProps & {
  userId: string;
  documentId: string;
  revisionId?: string;
  actorName: string;
  eventType:
  | NotificationEventType.PublishDocument
  | NotificationEventType.UpdateDocument;
  teamUrl: string;
};

type BeforeSend = {
  document: Document;
  collection: Collection | null;
  unsubscribeUrl: string;
  body: string | undefined;
  breadcrumb: string;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when they have enabled document notifications, the event
 * may be published or updated.
 */
export default class DocumentPublishedOrUpdatedEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected async beforeSend(props: InputProps) {
    const document = await Document.findByPk(props.documentId, {
      paranoid: false,
    });
    if (!document) {
      return false;
    }

    const collection = document.collectionId
      ? await Collection.findByPk(document.collectionId)
      : null;

    // Get the breadcrumb string
    const breadcrumb = await DocumentHelper.getBreadcrumbString(document);

    // If this is an update notification then fetch the previous revision to create a diff
    let body;
    if (props.revisionId) {
      const revision = await Revision.findByPk(props.revisionId);
      if (revision) {
        const previous = await Revision.findOne({
          where: {
            documentId: document.id,
          },
          order: [["createdAt", "DESC"]],
        });
        body = await DocumentHelper.toEmailDiff(previous, revision);
      }
    }

    return {
      document,
      collection,
      breadcrumb,
      body,
      unsubscribeUrl: this.unsubscribeUrl(props),
    };
  }

  protected unsubscribeUrl({ userId, eventType }: InputProps) {
    return NotificationSettingsHelper.unsubscribeUrl(userId, eventType);
  }

  eventName(eventType: NotificationEventType) {
    switch (eventType) {
      case NotificationEventType.PublishDocument:
        return "published";
      case NotificationEventType.UpdateDocument:
        return "updated";
      default:
        return "";
    }
  }

  protected subject({ document, eventType }: Props) {
    return `“${document.titleWithDefault}” ${this.eventName(eventType)}`;
  }

  protected preview({ actorName, eventType }: Props): string {
    return `${actorName} ${this.eventName(eventType)} a document`;
  }

  protected fromName({ actorName }: Props) {
    return actorName;
  }

  protected replyTo({ notification }: Props) {
    if (notification?.user && notification.actor?.email) {
      if (can(notification.user, "readEmail", notification.actor)) {
        return notification.actor.email;
      }
    }
    return;
  }

  protected renderAsText({
    actorName,
    teamUrl,
    document,
    collection,
    eventType,
  }: Props): string {
    const eventName = this.eventName(eventType);

    return `
"${document.titleWithDefault}" ${eventName}

${actorName} ${eventName} the document "${document.titleWithDefault}"${collection?.name ? `, in the ${collection.name} collection` : ""
      }.

Open Document: ${teamUrl}${document.url}
`;
  }

  protected render(props: Props) {
    const { document, collection, actorName, teamUrl, eventType, breadcrumb } = props;

    return (
      <EmailTemplate>
        <Header />

        <Body>
          <Heading>
            {eventType === NotificationEventType.PublishDocument
              ? "Document published"
              : "Document updated"}
          </Heading>

          <p style={{ fontSize: "16px", margin: "16px 0", color: "#666" }}>
            {breadcrumb}
          </p>

          <p>
            {actorName}{" "}
            {eventType === NotificationEventType.PublishDocument
              ? "published"
              : "updated"}{" "}
            the document{" "}
            <a href={`${teamUrl}${document.url}`}>{document.title}</a>
            {collection && (
              <>
                {" "}
                in the{" "}
                <a href={`${teamUrl}${collection.url}`}>{collection.name}</a>{" "}
                collection
              </>
            )}
            .
          </p>

          {props.body && (
            <>
              <EmptySpace height={20} />
              <Diff>{props.body}</Diff>
            </>
          )}

          <EmptySpace height={20} />

          <p>
            <Button href={`${teamUrl}${document.url}`}>
              Open Document
            </Button>
          </p>
        </Body>

        <Footer>
          <Link href={props.unsubscribeUrl}>Unsubscribe from notifications</Link>
        </Footer>
      </EmailTemplate>
    );
  }
}
