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
    return this.t("Your account deletion request");
  }

  protected preview() {
    return this.t("Your requested account deletion code");
  }

  protected renderAsText({ teamName, deleteConfirmationCode }: Props): string {
    return `
${this.t(
  "You requested to permanently delete your {{ appName }} user account in the {{ teamName }} workspace. Please enter the code below to confirm your account deletion.",
  { appName: env.APP_NAME, teamName }
)}

${this.t("Code")}: ${deleteConfirmationCode}
`;
  }

  protected render({ teamUrl, teamName, deleteConfirmationCode }: Props) {
    return (
      <EmailTemplate previewText={this.preview()}>
        <Header />

        <Body>
          <Heading>{this.t("Your account deletion request")}</Heading>
          <p>
            {this.t(
              "You requested to permanently delete your {{ appName }} user account in the",
              { appName: env.APP_NAME }
            )}{" "}
            <a href={teamUrl}>{teamName}</a>{" "}
            {this.t(
              "workspace. Please enter the code below to confirm your account deletion."
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
