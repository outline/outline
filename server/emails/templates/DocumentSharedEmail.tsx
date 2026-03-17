import * as React from "react";
import { DocumentPermission } from "@shared/types";
import { Document, GroupMembership, UserMembership } from "@server/models";
import type { EmailProps } from "./BaseEmail";
import BaseEmail, { EmailMessageCategory } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import Header from "./components/Header";
import Heading from "./components/Heading";

type InputProps = EmailProps & {
  userId: string;
  documentId: string;
  membershipId?: string;
  actorName: string;
  teamUrl: string;
};

type BeforeSend = {
  document: Document;
  membership: UserMembership | GroupMembership;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when someone adds them to a document.
 */
export default class DocumentSharedEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected async beforeSend({ documentId, membershipId }: InputProps) {
    if (!membershipId) {
      return false;
    }

    const document = await Document.unscoped().findByPk(documentId);
    if (!document) {
      return false;
    }

    const membership =
      (await UserMembership.findByPk(membershipId)) ??
      (await GroupMembership.findByPk(membershipId));

    if (!membership) {
      return false;
    }

    return { document, membership };
  }

  protected subject({ actorName, document }: Props) {
    return this.t(`{{ actorName }} shared “{{ documentTitle }}” with you`, {
      actorName,
      documentTitle: document.titleWithDefault,
    });
  }

  protected preview({ actorName }: Props): string {
    return this.t("{{ actorName }} shared a document", { actorName });
  }

  protected fromName({ actorName }: Props) {
    return actorName;
  }

  protected renderAsText({ actorName, teamUrl, document }: Props): string {
    return `
${this.t(`{{ actorName }} shared “{{ documentTitle }}” with you.`, { actorName, documentTitle: document.titleWithDefault })}

${this.t("View Document")}: ${teamUrl}${document.path}
`;
  }

  protected render(props: Props) {
    const { document, membership, actorName, teamUrl } = props;
    const documentUrl = `${teamUrl}${document.path}?ref=notification-email`;

    const permission =
      membership.permission === DocumentPermission.Read
        ? this.t("view")
        : this.t("edit");

    return (
      <EmailTemplate
        previewText={this.preview(props)}
        goToAction={{ url: documentUrl, name: this.t("View Document") }}
      >
        <Header />

        <Body>
          <Heading>{document.titleWithDefault}</Heading>
          <p>
            {this.t("{{ actorName }} invited you to {{ permission }} the", {
              actorName,
              permission,
            })}{" "}
            <a href={documentUrl}>{document.titleWithDefault}</a>{" "}
            {this.t("document")}.
          </p>
          <p>
            <Button href={documentUrl}>{this.t("View Document")}</Button>
          </p>
        </Body>
      </EmailTemplate>
    );
  }
}
