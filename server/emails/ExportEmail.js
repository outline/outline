// @flow
import * as React from 'react';
import EmailTemplate from './components/EmailLayout';
import Body from './components/Body';
import Button from './components/Button';
import Heading from './components/Heading';
import Header from './components/Header';
import Footer from './components/Footer';
import EmptySpace from './components/EmptySpace';

export const exportEmailText = `
Your data export

You requested a data export from Outline, here it is.
`;

export const ExportEmail = () => {
  return (
    <EmailTemplate>
      <Header />

      <Body>
        <Heading>Your data export</Heading>

        <p>You requested a data export from Outline, here it is.</p>
      </Body>

      <Footer />
    </EmailTemplate>
  );
};
