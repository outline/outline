import * as React from "react";
import env from "@server/env";
import type { EmailProps } from "./BaseEmail";
import BaseEmail, { EmailMessageCategory } from "./BaseEmail";
import Body from "./components/Body";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type Props = EmailProps & {
  email: string;
  teamName: string;
  teamUrl: string;
};

/**
 * Security notice sent to the previous address of a user after their email
 * address has been changed.
 */
export default class EmailUpdatedEmail extends BaseEmail<Props> {
  protected get category() {
    return EmailMessageCategory.Authentication;
  }

  protected subject() {
    return this.t("Your account email was changed");
  }

  protected preview() {
    return this.t("The email address on your {{ appName }} account changed.", {
      appName: env.APP_NAME,
    });
  }

  protected renderAsText({ email, teamName, teamUrl }: Props): string {
    return `
${this.t(
  "The email address for your {{ appName }} account in the {{ teamName }} workspace was changed to {{ email }}. This address will no longer receive emails for the account.",
  { appName: env.APP_NAME, teamName, email }
)}

${this.t(
  "If you did not expect this change, contact your workspace admin immediately to secure your account, otherwise no action is required."
)}

${teamUrl}
`;
  }

  protected render({ email, teamName, teamUrl }: Props) {
    return (
      <EmailTemplate previewText={this.preview()}>
        <Header />

        <Body>
          <Heading>{this.t("Your account email was changed")}</Heading>
          <p>
            {this.t("The email address for your {{ appName }} account in the", {
              appName: env.APP_NAME,
            })}{" "}
            <a href={teamUrl}>{teamName}</a>{" "}
            {this.t("workspace was changed to")} <strong>{email}</strong>.{" "}
            {this.t(
              "This address will no longer receive emails for the account."
            )}
          </p>
          <EmptySpace height={5} />
          <p>
            <strong>
              {this.t(
                "If you did not expect this change, contact your workspace admin immediately to secure your account, otherwise no action is required."
              )}
            </strong>
          </p>
        </Body>

        <Footer />
      </EmailTemplate>
    );
  }
}
