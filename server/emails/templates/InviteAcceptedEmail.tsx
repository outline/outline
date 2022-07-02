import * as React from "react";
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
  inviteName: string;
  teamUrl: string;
  unsubscribeUrl: string;
};

/**
 * Email sent to a user when someone they invited successfully signs up.
 */
export default class InviteAcceptedEmail extends BaseEmail<Props> {
  protected subject({ inviteName }: Props) {
    return `${inviteName} has joined your Outline team`;
  }

  protected preview({ inviteName }: Props) {
    return `Great news, ${inviteName}, accepted your invitation`;
  }

  protected renderAsText({ inviteName, teamUrl }: Props): string {
    return `
Great news, ${inviteName} just accepted your invitation and has created an account. You can now start collaborating on documents.

Open Outline: ${teamUrl}
`;
  }

  protected render({ inviteName, teamUrl, unsubscribeUrl }: Props) {
    return (
      <EmailTemplate>
        <Header />

        <Body>
          <Heading>{inviteName} has joined your team</Heading>
          <p>
            Great news, {inviteName} just accepted your invitation and has
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
