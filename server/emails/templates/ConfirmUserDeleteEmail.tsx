import * as React from "react";
import env from "@server/env";
import BaseEmail, { EmailMessageCategory, EmailProps } from "./BaseEmail";
import Body from "./components/Body";
import CopyableCode from "./components/CopyableCode";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type Props = EmailProps & {
  deleteConfirmationCode: string;
  teamName: string;
  teamUrl: string;
};

/**
 * Email sent to a user when they request to delete their account.
 */
export default class ConfirmUserDeleteEmail extends BaseEmail<Props> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected subject() {
    return `Your account deletion request`;
  }

  protected preview() {
    return `Your requested account deletion code`;
  }

  protected renderAsText({ teamName, deleteConfirmationCode }: Props): string {
    return `
You requested to permanently delete your ${env.APP_NAME} user account in the ${teamName} workspace. Please enter the code below to confirm your account deletion.

Code: ${deleteConfirmationCode}
`;
  }

  protected render({ teamUrl, teamName, deleteConfirmationCode }: Props) {
    return (
      <EmailTemplate previewText={this.preview()}>
        <Header />

        <Body>
          <Heading>Your account deletion request</Heading>
          <p>
            You requested to permanently delete your {env.APP_NAME} user account
            in the <a href={teamUrl}>{teamName}</a> workspace. Please enter the
            code below to confirm your account deletion.
          </p>
          <EmptySpace height={5} />
          <p>
            <CopyableCode>{deleteConfirmationCode}</CopyableCode>
          </p>
        </Body>

        <Footer />
      </EmailTemplate>
    );
  }
}
