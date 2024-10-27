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
};

/**
 * Email sent to a user when they request to delete their workspace.
 */
export default class ConfirmTeamDeleteEmail extends BaseEmail<Props> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected subject() {
    return `Your workspace deletion request`;
  }

  protected preview() {
    return `Your requested workspace deletion code`;
  }

  protected renderAsText({ deleteConfirmationCode }: Props): string {
    return `
You requested to permanently delete your ${env.APP_NAME} workspace. Please enter the code below to confirm the workspace deletion.

Code: ${deleteConfirmationCode}
`;
  }

  protected render({ deleteConfirmationCode }: Props) {
    return (
      <EmailTemplate previewText={this.preview()}>
        <Header />

        <Body>
          <Heading>Your workspace deletion request</Heading>
          <p>
            You requested to permanently delete your {env.APP_NAME} workspace.
            Please enter the code below to confirm your workspace deletion.
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
