import * as React from "react";
import { NotificationEventType, TeamPreference } from "@shared/types";
import { Day } from "@shared/utils/time";
import type { Collection } from "@server/models";
import { Document, Revision, User } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import HTMLHelper from "@server/models/helpers/HTMLHelper";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import { diffSnippet, leadingSnippet } from "@server/emails/snippets";
import SubscriptionHelper from "@server/models/helpers/SubscriptionHelper";
import { can } from "@server/policies";
import { CacheHelper } from "@server/utils/CacheHelper";
import { canUserAccessDocument } from "@server/utils/permissions";
import type { EmailProps } from "./BaseEmail";
import BaseEmail, { EmailMessageCategory } from "./BaseEmail";
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
  actorId?: string;
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
  /** Names of everyone who contributed to the revision, actor first. */
  actorNames: string;
  /** The number of contributors named in actorNames. */
  actorCount: number;
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
    const [document, recipient] = await Promise.all([
      Document.unscoped().findByPk(documentId, {
        includeState: true,
      }),
      User.findByPk(props.userId),
    ]);
    if (!document || !recipient) {
      return false;
    }

    // Access may have been revoked since the notification was created.
    if (!(await canUserAccessDocument(recipient, document.id))) {
      return false;
    }

    const [collection, team, revision] = await Promise.all([
      document.$get("collection"),
      document.$get("team"),
      revisionId ? Revision.findByPk(revisionId) : null,
    ]);

    let body;
    if (revision && team?.getPreference(TeamPreference.PreviewsInEmails)) {
      body = await CacheHelper.getDataOrSet<string>(
        `diff:${revision.id}`,
        async () => {
          // generate the diff html for the email
          const before = await revision.before();
          const content = await diffSnippet(before, revision, {
            includeTitle: false,
            centered: false,
            signedUrls: 4 * Day.seconds,
            baseUrl: props.teamUrl,
          });

          // inline all css so that it works in as many email providers as possible.
          return content ? await HTMLHelper.inlineCSS(content) : undefined;
        },
        30,
        10000
      );
    } else if (
      team &&
      props.eventType === NotificationEventType.PublishDocument &&
      team.getPreference(TeamPreference.PreviewsInEmails)
    ) {
      body = await CacheHelper.getDataOrSet<string>(
        `preview:${document.id}:${document.updatedAt.getTime()}`,
        async () => {
          const node = leadingSnippet(DocumentHelper.toProsemirror(document));
          return node ? await this.htmlForData(team, node) : undefined;
        },
        30,
        10000
      );
    }

    return {
      document,
      collection,
      body,
      ...(await this.actorNames(props, revision)),
      unsubscribeUrl: this.unsubscribeUrl(props),
    };
  }

  protected unsubscribeUrl({ userId, eventType }: InputProps) {
    return NotificationSettingsHelper.unsubscribeUrl(userId, eventType);
  }

  eventName(eventType: NotificationEventType) {
    switch (eventType) {
      case NotificationEventType.PublishDocument:
        return this.t("published");
      case NotificationEventType.UpdateDocument:
        return this.t("updated");
      default:
        return "";
    }
  }

  protected subject({ document, eventType }: Props) {
    return this.t(`“{{ documentTitle }}” {{ eventName }}`, {
      documentTitle: document.displayTitle,
      eventName: this.eventName(eventType),
    });
  }

  protected preview({ actorNames, actorCount, eventType }: Props): string {
    return this.t("{{ actorName }} {{ eventName }} a document", {
      actorName: actorNames,
      count: actorCount,
      eventName: this.eventName(eventType),
    });
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
    actorNames,
    actorCount,
    teamUrl,
    document,
    collection,
    eventType,
  }: Props): string {
    const eventName = this.eventName(eventType);

    return `
${this.t("“{{ documentTitle }}” {{ eventName }}", { documentTitle: document.displayTitle, eventName })}

${this.t("{{ actorName }} {{ eventName }} the document “{{ documentTitle }}”", { actorName: actorNames, count: actorCount, eventName, documentTitle: document.displayTitle })}${
      collection?.name
        ? `, ${this.t("in the {{ collectionName }} collection", { collectionName: collection.name })}`
        : ""
    }.

${this.t("Open Document")}: ${teamUrl}${document.url}
`;
  }

  protected render(props: Props) {
    const {
      document,
      actorNames,
      actorCount,
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
        goToAction={{ url: documentLink, name: this.t("View Document") }}
      >
        <Header />

        <Body>
          <Heading>
            {this.t(`“{{ documentTitle }}” {{ eventName }}`, {
              documentTitle: document.displayTitle,
              eventName,
            })}
          </Heading>
          <p>
            {this.t("{{ actorName }} {{ eventName }} the document", {
              actorName: actorNames,
              count: actorCount,
              eventName,
            })}{" "}
            <a href={documentLink}>{document.displayTitle}</a>
            {collection?.name ? (
              <>
                ,{" "}
                {this.t("in the {{ collectionName }} collection", {
                  collectionName: collection.name,
                })}
              </>
            ) : (
              ""
            )}
            .
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
            <Button href={documentLink}>{this.t("Open Document")}</Button>
          </p>
        </Body>

        <Footer
          unsubscribeUrl={unsubscribeUrl}
          unsubscribeText={this.t("Unsubscribe from these emails")}
        >
          <Link
            href={SubscriptionHelper.unsubscribeUrl(
              props.userId,
              props.documentId
            )}
          >
            {this.t("Unsubscribe from this doc")}
          </Link>
        </Footer>
      </EmailTemplate>
    );
  }

  /**
   * Returns the names of everyone who contributed to an update, with the actor
   * first, joined into a single string.
   *
   * @param props The email props.
   * @param revision The revision that triggered the email, if any.
   * @returns The joined names and the number of contributors.
   */
  private async actorNames(
    { actorId, actorName, eventType }: InputProps,
    revision: Revision | null
  ) {
    if (
      !actorId ||
      !revision ||
      eventType !== NotificationEventType.UpdateDocument
    ) {
      return { actorNames: actorName, actorCount: 1 };
    }

    const collaborators = await revision.collaborators;
    const names = [
      actorName,
      ...collaborators
        .filter((user) => user && user.id !== actorId)
        .map((user) => user.name),
    ];

    return { actorNames: this.formatList(names), actorCount: names.length };
  }
}
