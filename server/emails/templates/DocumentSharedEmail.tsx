import * as React from "react";
import { DocumentPermission } from "@shared/types";
import { Document, UserMembership } from "@server/models";
import BaseEmail, { EmailProps } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import Header from "./components/Header";
import Heading from "./components/Heading";

type InputProps = EmailProps & {
  userId: string;
  documentId: string;
  actorName: string;
  teamUrl: string;
};

type BeforeSend = {
  document: Document;
  membership: UserMembership;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when someone adds them to a document.
 */
export default class DocumentSharedEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected async beforeSend({ documentId, userId }: InputProps) {
    const document = await Document.unscoped().findByPk(documentId);
    if (!document) {
      return false;
    }

    const membership = await UserMembership.findOne({
      where: {
        documentId,
        userId,
      },
    });
    if (!membership) {
      return false;
    }

    return { document, membership };
  }

  protected subject({ actorName, document }: Props) {
    return `${actorName} shared “${document.title}” with you`;
  }

  protected preview({ actorName }: Props): string {
    return `${actorName} shared a document`;
  }

  protected fromName({ actorName }: Props) {
    return actorName;
  }

  protected renderAsText({ actorName, teamUrl, document }: Props): string {
    return `
${actorName} shared “${document.title}” with you.

View Document: ${teamUrl}${document.path}
`;
  }

  protected render(props: Props) {
    const { document, membership, actorName, teamUrl } = props;
    const documentUrl = `${teamUrl}${document.path}?ref=notification-email`;

    const permission =
      membership.permission === DocumentPermission.Read ? "view" : "edit";

    return (
      <EmailTemplate
        previewText={this.preview(props)}
        goToAction={{ url: documentUrl, name: "View Document" }}
      >
        <Header />

        <Body>
          <Heading>{document.title}</Heading>
          <p>
            {actorName} invited you to {permission} the{" "}
            <a href={documentUrl}>{document.title}</a> document.
          </p>
          <p>
            <Button href={documentUrl}>View Document</Button>
          </p>
        </Body>
      </EmailTemplate>
    );
  }
}
