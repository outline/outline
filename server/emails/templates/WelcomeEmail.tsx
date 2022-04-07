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
  teamUrl: string;
};

/**
 * Email sent to a user when their account has just been created, or they signed
 * in for the first time from an invite.
 */
export default class WelcomeEmail extends BaseEmail<Props> {
  protected subject() {
    return "Welcome to Outline";
  }

  protected preview() {
    return "Outline is a place for your team to build and share knowledge.";
  }

  protected renderAsText({ teamUrl }: Props) {
    return `
Welcome to Outline!

Outline is a place for your team to build and share knowledge.

To get started, head to your dashboard and try creating a collection to help document your workflow, create playbooks or help with team onboarding.

You can also import existing Markdown documents by dragging and dropping them to your collections.

${teamUrl}/home
`;
  }

  protected render({ teamUrl }: Props) {
    return (
      <EmailTemplate>
        <Header />

        <Body>
          <Heading>Welcome to Outline!</Heading>
          <p>Outline is a place for your team to build and share knowledge.</p>
          <p>
            To get started, head to your dashboard and try creating a collection
            to help document your workflow, create playbooks or help with team
            onboarding.
          </p>
          <p>
            You can also import existing Markdown documents by dragging and
            dropping them to your collections.
          </p>
          <EmptySpace height={10} />
          <p>
            <Button href={`${teamUrl}/home`}>View my dashboard</Button>
          </p>
        </Body>

        <Footer />
      </EmailTemplate>
    );
  }
}
