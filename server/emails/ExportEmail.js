// @flow
import * as React from "react";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

export const exportEmailText = `
Your Data Export

Your requested data export is attached as a zip file to this email.
`;

export const ExportEmail = () => {
  return (
    <EmailTemplate>
      <Header />

      <Body>
        <Heading>Your Data Export</Heading>
        <p>
          Your requested data export is attached as a zip file to this email.
        </p>
        <EmptySpace height={10} />
        <p>
          <Button href={`${process.env.URL}/home`}>Go to dashboard</Button>
        </p>
      </Body>

      <Footer />
    </EmailTemplate>
  );
};
