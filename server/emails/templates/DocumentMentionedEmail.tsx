import differenceBy from "lodash/differenceBy";
import * as React from "react";
import { MentionType } from "@shared/types";
import { Document, Revision } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { can } from "@server/policies";
import BaseEmail, { EmailMessageCategory, EmailProps } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import Diff from "./components/Diff";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Header from "./components/Header";
import Heading from "./components/Heading";

type InputProps = EmailProps & {
  documentId: string;
  revisionId: string | undefined;
  userId: string;
  actorName: string;
  teamUrl: string;
};

type BeforeSend = {
  document: Document;
  body: string | undefined;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when someone mentions them in a document.
 */
export default class DocumentMentionedEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected async beforeSend({ documentId, revisionId, userId }: InputProps) {
    const document = await Document.unscoped().findByPk(documentId);
    if (!document) {
      return false;
    }

    const team = await document.$get("team");
    if (!team) {
      return false;
    }

    let currDoc: Document | Revision = document;
    let prevDoc: Revision | undefined;

    if (revisionId) {
      const revision = await Revision.findByPk(revisionId);
      if (!revision) {
        return false;
      }
      currDoc = revision;
      prevDoc = (await revision.before()) ?? undefined;
    }

    const currMentions = DocumentHelper.parseMentions(currDoc, {
      type: MentionType.User,
      modelId: userId,
    });
    const prevMentions = prevDoc
      ? DocumentHelper.parseMentions(prevDoc, {
          type: MentionType.User,
          modelId: userId,
        })
      : [];

    const firstNewMention = differenceBy(currMentions, prevMentions, "id")[0];

    let body: string | undefined;

    if (firstNewMention) {
      const node = ProsemirrorHelper.getNodeForMentionEmail(
        DocumentHelper.toProsemirror(currDoc),
        firstNewMention
      );
      if (node) {
        body = await this.htmlForData(team, node);
      }
    }

    return { document, body };
  }

  protected subject({ document }: Props) {
    return `Mentioned you in “${document.titleWithDefault}”`;
  }

  protected preview({ actorName }: Props): string {
    return `${actorName} mentioned you`;
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

  protected renderAsText({ actorName, teamUrl, document }: Props): string {
    return `
You were mentioned

${actorName} mentioned you in the document “${document.titleWithDefault}”.

Open Document: ${teamUrl}${document.url}
`;
  }

  protected render(props: Props) {
    const { document, actorName, teamUrl, body } = props;
    const documentLink = `${teamUrl}${document.url}?ref=notification-email`;

    return (
      <EmailTemplate
        previewText={this.preview(props)}
        goToAction={{ url: documentLink, name: "View Document" }}
      >
        <Header />

        <Body>
          <Heading>You were mentioned</Heading>
          <p>
            {actorName} mentioned you in the document{" "}
            <a href={documentLink}>{document.titleWithDefault}</a>.
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
      </EmailTemplate>
    );
  }
}
