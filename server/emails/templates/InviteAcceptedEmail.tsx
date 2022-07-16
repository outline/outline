import * as React from "react";
import { NotificationSetting } from "@server/models";
import BaseEmail from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type Props = {
  to: string;
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
export default class InviteAcceptedEmail extends BaseEmail<Props> {
  protected async beforeSend({ inviterId }: Props) {
    const notificationSetting = await NotificationSetting.findOne({
      where: {
        userId: inviterId,
        event: "emails.invite_accepted",
      },
    });
    if (!notificationSetting) {
      return false;
    }

    return { unsubscribeUrl: notificationSetting.unsubscribeUrl };
  }

  protected subject({ invitedName }: Props) {
    return `${invitedName} has joined your Outline team`;
  }

  protected preview({ invitedName }: Props) {
    return `Great news, ${invitedName}, accepted your invitation`;
  }

  protected renderAsText({ invitedName, teamUrl }: Props): string {
    return `
Great news, ${invitedName} just accepted your invitation and has created an account. You can now start collaborating on documents.

Open Outline: ${teamUrl}
`;
  }

  protected render({
    invitedName,
    teamUrl,
    unsubscribeUrl,
  }: Props & BeforeSendProps) {
    return (
      <EmailTemplate>
        <Header />

        <Body>
          <Heading>{invitedName} has joined your team</Heading>
          <p>
            Great news, {invitedName} just accepted your invitation and has
            created an account. You can now start collaborating on documents.
          </p>
          <EmptySpace height={10} />
          <p>
            <Button href={teamUrl}>Open Outline</Button>
          </p>
        </Body>

        <Footer unsubscribeUrl={unsubscribeUrl} />
      </EmailTemplate>
    );
  }
}
