import * as React from "react";
import env from "@server/env";
import type { EmailProps } from "./BaseEmail";
import BaseEmail, { EmailMessageCategory } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type Props = EmailProps & {
  name: string;
  actorName: string;
  actorEmail: string | null;
  teamName: string;
  teamUrl: string;
};

/**
 * Email sent to an external user when an admin sends them an invite and they
 * haven't signed in after a few days.
 */
export default class InviteReminderEmail extends BaseEmail<Props> {
  protected get category() {
    return EmailMessageCategory.Invitation;
  }

  protected subject({ actorName, teamName }: Props) {
    return (
      this.t("Reminder") +
      ": " +
      this.t("{{ actorName }} invited you to join {{ teamName }}’s workspace", {
        actorName,
        teamName,
      })
    );
  }

  protected preview() {
    return this.t(
      "{{ appName }} is a place for your team to build and share knowledge.",
      {
        appName: env.APP_NAME,
      }
    );
  }

  protected renderAsText({
    teamName,
    actorName,
    actorEmail,
    teamUrl,
  }: Props): string {
    return `
${this.t("This is just a quick reminder that {{ actorName }} {{ actorEmail }} invited you to join them in the {{ teamName }} team on {{ appName }}, a place for your team to build and share knowledge.", { actorName, actorEmail: actorEmail ? `(${actorEmail})` : "", teamName, appName: env.APP_NAME })}
${this.t("We only send a reminder once.")}

${this.t("If you haven't signed up yet, you can do so here")}: ${teamUrl}
`;
  }

  protected render({ teamName, actorName, actorEmail, teamUrl }: Props) {
    const inviteLink = `${teamUrl}?ref=invite-reminder-email`;
    return (
      <EmailTemplate previewText={this.preview()}>
        <Header />

        <Body>
          <Heading>
            {this.t("Join {{ teamName }} on {{ appName }}", {
              teamName,
              appName: env.APP_NAME,
            })}
          </Heading>
          <p>
            {this.t(
              "This is just a quick reminder that {{ actorName }} {{ actorEmail }} invited you to join them in the {{ teamName }} team on {{ appName }}, a place for your team to build and share knowledge.",
              {
                actorName,
                actorEmail: actorEmail ? `(${actorEmail})` : "",
                teamName,
                appName: env.APP_NAME,
              }
            )}
          </p>
          <p>{this.t("If you haven't signed up yet, you can do so here")}:</p>
          <EmptySpace height={10} />
          <p>
            <Button href={inviteLink}>{this.t("Join now")}</Button>
          </p>
        </Body>

        <Footer />
      </EmailTemplate>
    );
  }
}
