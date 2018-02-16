// @flow
import * as React from 'react';
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
  state?: string,
  label?: string,
};

function SlackButton({ auth, state, label, scopes, redirectUri }: Props) {
  const handleClick = () =>
    (window.location.href = slackAuth(
      state ? auth.saveOauthState(state) : auth.genOauthState(),
      scopes,
      redirectUri
    ));

  return (
    <Button onClick={handleClick} icon={<SpacedSlackLogo size={24} />} neutral>
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

export default inject('auth')(SlackButton);
