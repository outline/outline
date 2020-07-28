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
  token: string,
  teamUrl: string,
};

export const signinEmailText = ({ token, teamUrl }: Props) => `
Use the link below to signin to Outline:

${process.env.URL}/auth/email.callback?token=${token}

If your magic link expired you can request a new one from your team’s
signin page at: ${teamUrl}
`;

export const SigninEmail = ({ token, teamUrl }: Props) => {
  return (
    <EmailTemplate>
      <Header />

      <Body>
        <Heading>Magic signin link</Heading>
        <p>Click the button below to signin to Outline.</p>
        <EmptySpace height={10} />
        <p>
          <Button
            href={`${process.env.URL}/auth/email.callback?token=${token}`}
          >
            Sign In
          </Button>
        </p>
        <EmptySpace height={10} />
        <p>
          If your magic link expired you can request a new one from your team’s
          signin page at: <a href={teamUrl}>{teamUrl}</a>
        </p>
      </Body>

      <Footer />
    </EmailTemplate>
  );
};
