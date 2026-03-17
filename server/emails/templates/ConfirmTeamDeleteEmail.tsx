import * as React from "react";
import env from "@server/env";
import type { EmailProps } from "./BaseEmail";
import BaseEmail, { EmailMessageCategory } from "./BaseEmail";
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
    return this.t("Your workspace deletion request");
  }

  protected preview() {
    return this.t("Your requested workspace deletion code");
  }

  protected renderAsText({ deleteConfirmationCode }: Props): string {
    return `
${this.t(
  "You requested to permanently delete your {{ appName }} workspace. Please enter the code below to confirm your workspace deletion.",
  { appName: env.APP_NAME }
)}

${this.t("Code")}: ${deleteConfirmationCode}
`;
  }

  protected render({ deleteConfirmationCode }: Props) {
    return (
      <EmailTemplate previewText={this.preview()}>
        <Header />

        <Body>
          <Heading>{this.t("Your workspace deletion request")}</Heading>
          <p>
            {this.t(
              "You requested to permanently delete your {{ appName }} workspace. Please enter the code below to confirm your workspace deletion.",
              { appName: env.APP_NAME }
            )}
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
