import differenceBy from "lodash/differenceBy";
import * as React from "react";
import { MentionType } from "@shared/types";
import { Document, Revision, Group } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { can } from "@server/policies";
import type { EmailProps } from "./BaseEmail";
import BaseEmail, { EmailMessageCategory } from "./BaseEmail";
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
  actorName: string;
  teamUrl: string;
  groupId: string;
};

type BeforeSend = {
  document: Document;
  groupName: string;
  body: string | undefined;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when they are a member of a group mentioned in a document.
 */
export default class GroupDocumentMentionedEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected async beforeSend({ documentId, revisionId, groupId }: InputProps) {
    const document = await Document.unscoped().findByPk(documentId);
    if (!document) {
      return false;
    }

    const group = await Group.findByPk(groupId);
    if (!group) {
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
      type: MentionType.Group,
      modelId: groupId,
    });
    const prevMentions = prevDoc
      ? DocumentHelper.parseMentions(prevDoc, {
          type: MentionType.Group,
          modelId: groupId,
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

    return { document, body, groupName: group.name };
  }

  protected subject({ document, groupName }: Props) {
    return `The ${groupName} group was mentioned in “${document.titleWithDefault}”`;
  }

  protected preview({ actorName, groupName }: Props): string {
    return `${actorName} mentioned the "${groupName}" group`;
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
    groupName,
  }: Props): string {
    return `
${actorName} mentioned the “${groupName}” group in the document “${document.titleWithDefault}”.

Open Document: ${teamUrl}${document.url}
`;
  }

  protected render(props: Props) {
    const { document, actorName, teamUrl, body, groupName } = props;
    const documentLink = `${teamUrl}${document.url}?ref=notification-email`;

    return (
      <EmailTemplate
        previewText={this.preview(props)}
        goToAction={{ url: documentLink, name: "View Document" }}
      >
        <Header />

        <Body>
          <Heading>Your group was mentioned</Heading>
          <p>
            {actorName} mentioned the "{groupName}" group in the document{" "}
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
