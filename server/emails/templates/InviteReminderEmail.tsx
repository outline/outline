import * as React from "react";
import env from "@server/env";
import BaseEmail, { EmailProps } from "./BaseEmail";
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
export default class InviteReminderEmail extends BaseEmail<
  Props,
  Record<string, any>
> {
  protected subject({ actorName, teamName }: Props) {
    return `Reminder: ${actorName} invited you to join ${teamName}’s knowledge base`;
  }

  protected preview() {
    return `${env.APP_NAME} is a place for your team to build and share knowledge.`;
  }

  protected markup({ teamUrl }: Props) {
    const url = `${teamUrl}?ref=invite-reminder-email`;
    const name = "Join now";

    return JSON.stringify({
      "@context": "http://schema.org",
      "@type": "EmailMessage",
      potentialAction: {
        "@type": "ViewAction",
        url,
        name,
      },
    });
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
    return (
      <EmailTemplate
        previewText={this.preview()}
        markup={this.markup({ teamUrl } as Props)}
      >
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
            <Button href={`${teamUrl}?ref=invite-reminder-email`}>
              Join now
            </Button>
          </p>
        </Body>

        <Footer />
      </EmailTemplate>
    );
  }
}
