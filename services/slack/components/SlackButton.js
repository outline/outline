// @flow
import React from 'react';
import styled from 'styled-components';
import { inject } from 'mobx-react';
import { slackAuth } from 'shared/utils/routeHelpers';
import Button from 'components/Button';
import SlackLogo from 'shared/components/SlackLogo';
import AuthStore from 'stores/AuthStore';

type Props = {
  auth: AuthStore,
  scopes?: string[],
  redirectUri?: string,
};

function SlackButton({ auth, scopes, redirectUri }: Props) {
  const handleClick = () =>
    (window.location.href = slackAuth(
      auth.getOauthState(),
      scopes,
      redirectUri
    ));

  return (
    <Button onClick={handleClick} icon={<SpacedSlackLogo size={24} />} neutral>
      Add to <strong>Slack</strong>
    </Button>
  );
}

const SpacedSlackLogo = styled(SlackLogo)`
  padding-right: 4px;
`;

export default inject('auth')(SlackButton);
