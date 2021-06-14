// @flow
import * as React from "react";
import Button from "components/Button";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import Scene from "components/Scene";
import ZapierIcon from "components/ZapierIcon";

function Zapier() {
  return (
    <Scene title="Zapier" icon={<ZapierIcon color="currentColor" />}>
      <Heading>Zapier</Heading>
      <HelpText>
        Zapier is a platform that allows Outline to easily integrate with
        thousands of other business tools. Head over to Zapier to setup a "Zap"
        and start programmatically interacting with Outline.
      </HelpText>
      <p>
        <Button
          onClick={() =>
            (window.location.href = "https://zapier.com/apps/outline")
          }
        >
          Open Zapier →
        </Button>
      </p>
    </Scene>
  );
}

export default Zapier;
