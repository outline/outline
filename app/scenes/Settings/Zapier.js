// @flow
import * as React from "react";
import Button from "components/Button";
import CenteredContent from "components/CenteredContent";
import HelpText from "components/HelpText";
import PageTitle from "components/PageTitle";

function Zapier() {
  return (
    <CenteredContent>
      <PageTitle title="Zapier" />
      <h1>Zapier</h1>
      <HelpText>
        Zapier is a platform that allows Outline to easily integrate with
        thousands of other business tools. Head over to Zapier to setup a "Zap"
        and start programmatically interacting with Outline.
      </HelpText>
      <p>
        <Button
          as="a"
          href="https://zapier.com/apps/outline"
          rel="noopener noreferrer"
          target="_blank"
        >
          Open Zapier →
        </Button>
      </p>
    </CenteredContent>
  );
}

export default Zapier;
