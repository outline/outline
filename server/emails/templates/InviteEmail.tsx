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
 * Email sent to an external user when an admin sends them an invite.
 */
export default class InviteEmail extends BaseEmail<Props, Record<string, any>> {
  protected subject({ actorName, teamName }: Props) {
    return `${actorName} invited you to join ${teamName}’s knowledge base`;
  }

  protected preview() {
    return `${env.APP_NAME} is a place for your team to build and share knowledge.`;
  }

  protected markup({ teamUrl }: Props) {
    const url = `${teamUrl}?ref=invite-email`;
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
Join ${teamName} on ${env.APP_NAME}

${actorName} ${actorEmail ? `(${actorEmail})` : ""} has invited you to join ${
      env.APP_NAME
    }, a place for your team to build and share knowledge.

Join now: ${teamUrl}
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
            {actorName} {actorEmail ? `(${actorEmail})` : ""} has invited you to
            join {env.APP_NAME}, a place for your team to build and share
            knowledge.
          </p>
          <EmptySpace height={10} />
          <p>
            <Button href={`${teamUrl}?ref=invite-email`}>Join now</Button>
          </p>
        </Body>

        <Footer />
      </EmailTemplate>
    );
  }
}
