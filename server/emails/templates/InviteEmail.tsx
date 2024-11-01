import * as React from "react";
import env from "@server/env";
import { can } from "@server/policies";
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
 * Email sent to an external user when an admin sends them an invite.
 */
export default class InviteEmail extends BaseEmail<Props, Record<string, any>> {
  protected get category() {
    return EmailMessageCategory.Invitation;
  }

  protected subject({ actorName, teamName }: Props) {
    return `${actorName} invited you to join ${teamName}’s workspace`;
  }

  protected preview() {
    return `${env.APP_NAME} is a place for your team to build and share knowledge.`;
  }

  protected replyTo({ notification }: Props) {
    if (notification?.user && notification.actor?.email) {
      if (can(notification.user, "readEmail", notification.actor)) {
        return notification.actor.email;
      }
    }
    return;
  }

  protected renderAsText({
    teamName,
    actorName,
    actorEmail,
    teamUrl,
  }: Props): string {
    return `
Join ${teamName} on ${env.APP_NAME}

${actorName} ${actorEmail ? `(${actorEmail})` : ""} has invited you to join ${
      env.APP_NAME
    }, a place for your team to build and share knowledge.

Join now: ${teamUrl}
`;
  }

  protected render({ teamName, actorName, actorEmail, teamUrl }: Props) {
    const inviteLink = `${teamUrl}?ref=invite-email`;

    return (
      <EmailTemplate previewText={this.preview()}>
        <Header />

        <Body>
          <Heading>
            Join {teamName} on {env.APP_NAME}
          </Heading>
          <p>
            {actorName} {actorEmail ? `(${actorEmail})` : ""} has invited you to
            join {env.APP_NAME}, a place for your team to build and share
            knowledge.
          </p>
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
