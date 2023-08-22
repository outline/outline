import * as React from "react";
import { NotificationEventType } from "@shared/types";
import env from "@server/env";
import { User } from "@server/models";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import BaseEmail, { EmailProps } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type Props = EmailProps & {
  inviterId: string;
  invitedName: string;
  teamUrl: string;
};

type BeforeSendProps = {
  unsubscribeUrl: string;
};

/**
 * Email sent to a user when someone they invited successfully signs up.
 */
export default class InviteAcceptedEmail extends BaseEmail<
  Props,
  BeforeSendProps
> {
  protected async beforeSend({ inviterId }: Props) {
    return {
      unsubscribeUrl: NotificationSettingsHelper.unsubscribeUrl(
        await User.findByPk(inviterId, { rejectOnEmpty: true }),
        NotificationEventType.InviteAccepted
      ),
    };
  }

  protected subject({ invitedName }: Props) {
    return `${invitedName} has joined your ${env.APP_NAME} team`;
  }

  protected preview({ invitedName }: Props) {
    return `Great news, ${invitedName}, accepted your invitation`;
  }

  protected markup({ teamUrl }: Props) {
    const url = teamUrl;
    const name = `Open ${env.APP_NAME}`;

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

  protected renderAsText({ invitedName, teamUrl }: Props): string {
    return `
Great news, ${invitedName} just accepted your invitation and has created an account. You can now start collaborating on documents.

Open ${env.APP_NAME}: ${teamUrl}
`;
  }

  protected render({
    invitedName,
    teamUrl,
    unsubscribeUrl,
  }: Props & BeforeSendProps) {
    return (
      <EmailTemplate
        previewText={this.preview({ invitedName } as Props)}
        markup={this.markup({ teamUrl } as Props)}
      >
        <Header />

        <Body>
          <Heading>{invitedName} has joined your team</Heading>
          <p>
            Great news, {invitedName} just accepted your invitation and has
            created an account. You can now start collaborating on documents.
          </p>
          <EmptySpace height={10} />
          <p>
            <Button href={teamUrl}>Open {env.APP_NAME}</Button>
          </p>
        </Body>

        <Footer unsubscribeUrl={unsubscribeUrl} />
      </EmailTemplate>
    );
  }
}
