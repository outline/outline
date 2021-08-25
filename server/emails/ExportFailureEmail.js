// @flow
import * as React from "react";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

export const exportEmailFailureText = `
Your Data Export

Sorry, your requested data export has failed, please visit the admin
section to try again – if the problem persists please contact support.
`;

export const ExportFailureEmail = () => {
  return (
    <EmailTemplate>
      <Header />

      <Body>
        <Heading>Your Data Export</Heading>
        <p>
          Sorry, your requested data export has failed, please visit the admin
          section to try again – if the problem persists please contact support.
        </p>
        <EmptySpace height={10} />
        <p>
          <Button href={`${process.env.URL}/settings/import-export`}>
            Go to export
          </Button>
        </p>
      </Body>

      <Footer />
    </EmailTemplate>
  );
};
