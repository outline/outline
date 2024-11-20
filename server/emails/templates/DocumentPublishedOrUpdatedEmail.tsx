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
  collection: Collection;
  unsubscribeUrl: string;
  body: string | undefined;
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
    const { documentId, revisionId } = props;
    const document = await Document.unscoped().findByPk(documentId, {
      includeState: true,
    });
    if (!document) {
      return false;
    }

    const [collection, team] = await Promise.all([
      document.$get("collection"),
      document.$get("team"),
    ]);
    if (!collection) {
      return false;
    }

    let body;
    if (revisionId && team?.getPreference(TeamPreference.PreviewsInEmails)) {
      body = await CacheHelper.getDataOrSet<string>(
        `diff:${revisionId}`,
        async () => {
          // generate the diff html for the email
          const revision = await Revision.findByPk(revisionId);

          if (revision) {
            const before = await revision.before();
            const content = await DocumentHelper.toEmailDiff(before, revision, {
              includeTitle: false,
              centered: false,
              signedUrls: 4 * Day.seconds,
              baseUrl: props.teamUrl,
            });

            // inline all css so that it works in as many email providers as possible.
            return content ? await HTMLHelper.inlineCSS(content) : undefined;
          }
          return;
        },
        30
      );
    }

    return {
      document,
      collection,
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
    return `“${document.title}” ${this.eventName(eventType)}`;
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
"${document.title}" ${eventName}

${actorName} ${eventName} the document "${document.title}", in the ${collection.name} collection.

Open Document: ${teamUrl}${document.url}
`;
  }

  protected render(props: Props) {
    const {
      document,
      actorName,
      collection,
      eventType,
      teamUrl,
      unsubscribeUrl,
      body,
    } = props;
    const documentLink = `${teamUrl}${document.url}?ref=notification-email`;
    const eventName = this.eventName(eventType);

    return (
      <EmailTemplate
        previewText={this.preview(props)}
        goToAction={{ url: documentLink, name: "View Document" }}
      >
        <Header />

        <Body>
          <Heading>
            “{document.title}” {eventName}
          </Heading>
          <p>
            {actorName} {eventName} the document{" "}
            <a href={documentLink}>{document.title}</a>, in the{" "}
            {collection.name} collection.
          </p>
          {body && (
            <>
              <EmptySpace height={20} />
              <Diff>
                <div dangerouslySetInnerHTML={{ __html: body }} />
              </Diff>
              <EmptySpace height={20} />
            </>
          )}
          <p>
            <Button href={documentLink}>Open Document</Button>
          </p>
        </Body>

        <Footer unsubscribeUrl={unsubscribeUrl}>
          <Link
            href={SubscriptionHelper.unsubscribeUrl(
              props.userId,
              props.documentId
            )}
          >
            Unsubscribe from this doc
          </Link>
        </Footer>
      </EmailTemplate>
    );
  }
}
