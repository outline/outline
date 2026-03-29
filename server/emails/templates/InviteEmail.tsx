import * as React from "react";
import env from "@server/env";
import { can } from "@server/policies";
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
 * Email sent to an external user when an admin sends them an invite.
 */
export default class InviteEmail extends BaseEmail<Props, void> {
  protected get category() {
    return EmailMessageCategory.Invitation;
  }

  protected subject({ actorName, teamName }: Props) {
    return this.t(
      "{{ actorName }} invited you to join {{ teamName }}’s workspace",
      {
        actorName,
        teamName,
      }
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
${this.t("Join {{ teamName }} on {{ appName }}", { teamName, appName: env.APP_NAME })}

${actorName} ${actorEmail ? `(${actorEmail})` : ""} ${this.t("has invited you to join {{ appName }}, a place for your team to build and share knowledge.", { appName: env.APP_NAME })}

${this.t("Join now")}: ${teamUrl}
`;
  }

  protected render({ teamName, actorName, actorEmail, teamUrl }: Props) {
    const inviteLink = `${teamUrl}?ref=invite-email`;

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
            {actorName} {actorEmail ? `(${actorEmail})` : ""}{" "}
            {this.t(
              "has invited you to join {{ appName }}, a place for your team to build and share knowledge.",
              { appName: env.APP_NAME }
            )}
          </p>
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
