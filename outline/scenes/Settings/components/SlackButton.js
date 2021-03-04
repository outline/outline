// @flow
import * as React from "react";
import styled from "styled-components";
import { slackAuth } from "shared/utils/routeHelpers";
import Button from "components/Button";
import SlackLogo from "components/SlackLogo";

type Props = {
  scopes?: string[],
  redirectUri: string,
  state: string,
  label?: string,
};

function SlackButton({ state, scopes, redirectUri, label }: Props) {
  const handleClick = () =>
    (window.location.href = slackAuth(
      state,
      scopes,
      process.env.GATSBY_SLACK_KEY,
      redirectUri
    ));

  return (
    <Button
      onClick={handleClick}
      icon={<SpacedSlackLogo size={24} fill="#000" />}
      neutral
    >
      {label ? (
        label
      ) : (
        <span>
          Add to <strong>Slack</strong>
        </span>
      )}
    </Button>
  );
}

const SpacedSlackLogo = styled(SlackLogo)`
  padding-right: 4px;
`;

export default SlackButton;
