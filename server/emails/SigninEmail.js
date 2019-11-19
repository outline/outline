// @flow
import * as React from 'react';
import EmailTemplate from './components/EmailLayout';
import Body from './components/Body';
import Button from './components/Button';
import Heading from './components/Heading';
import Header from './components/Header';
import Footer from './components/Footer';
import EmptySpace from './components/EmptySpace';

export type Props = {
  token: string,
};

export const signinEmailText = ({ token }: Props) => `
Use the link below to signin to Outline:

${process.env.URL}/api/auth/email.callback?token=${token}
`;

export const SigninEmail = ({ token }: Props) => {
  return (
    <EmailTemplate>
      <Header />

      <Body>
        <Heading>Magic signin link</Heading>
        <p>Click the button below to signin to Outline</p>
        <EmptySpace height={10} />
        <p>
          <Button
            href={`${process.env.URL}/api/auth/email.callback?token=${token}`}
          >
            Sign In
          </Button>
        </p>
      </Body>

      <Footer />
    </EmailTemplate>
  );
};
