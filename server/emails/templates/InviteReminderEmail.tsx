import * as React from "react";
import env from "@server/env";
import BaseEmail, { EmailMessageCategory, EmailProps } from "./BaseEmail";
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
    return `Reminder: ${actorName} invited you to join ${teamName}’s workspace`;
  }

  protected preview() {
    return `${env.APP_NAME} is a place for your team to build and share knowledge.`;
  }

  protected renderAsText({
    teamName,
    actorName,
    actorEmail,
    teamUrl,
  }: Props): string {
    return `
This is just a quick reminder that ${actorName} ${
      actorEmail ? `(${actorEmail})` : ""
    } invited you to join them in the ${teamName} team on ${
      env.APP_NAME
    }, a place for your team to build and share knowledge.
We only send a reminder once.

If you haven't signed up yet, you can do so here: ${teamUrl}
`;
  }

  protected render({ teamName, actorName, actorEmail, teamUrl }: Props) {
    const inviteLink = `${teamUrl}?ref=invite-reminder-email`;
    return (
      <EmailTemplate previewText={this.preview()}>
        <Header />

        <Body>
          <Heading>
            Join {teamName} on {env.APP_NAME}
          </Heading>
          <p>
            This is just a quick reminder that {actorName}{" "}
            {actorEmail ? `(${actorEmail})` : ""}
            invited you to join them in the {teamName} team on {env.APP_NAME}, a
            place for your team to build and share knowledge.
          </p>
          <p>If you haven't signed up yet, you can do so here:</p>
          <EmptySpace height={10} />
          <p>
            <Button href={inviteLink}>Join now</Button>
          </p>
        </Body>

        <Footer />
      </EmailTemplate>
    );
  }
}
