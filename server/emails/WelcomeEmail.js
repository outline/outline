// @flow
import * as React from "react";
import EmailTemplate from "./components/EmailLayout";
import Body from "./components/Body";
import Button from "./components/Button";
import Heading from "./components/Heading";
import Header from "./components/Header";
import Footer from "./components/Footer";
import EmptySpace from "./components/EmptySpace";

export type Props = {
  teamUrl: string,
};

export const welcomeEmailText = ({ teamUrl }: Props) => `
Welcome to Outline!

Outline is a place for your team to build and share knowledge.

To get started, head to your dashboard and try creating a collection to help document your workflow, create playbooks or help with team onboarding.

You can also import existing Markdown documents by dragging and dropping them to your collections.

${teamUrl}/home
`;

export const WelcomeEmail = ({ teamUrl }: Props) => {
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
};
