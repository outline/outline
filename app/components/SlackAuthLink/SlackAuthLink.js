// @flow
import React from 'react';
import { inject } from 'mobx-react';
import { slackAuth } from 'shared/utils/routeHelpers';
import AuthStore from 'stores/AuthStore';

type Props = {
  children: React$Element<*>,
  auth: AuthStore,
  scopes?: string[],
  redirectUri?: string,
};

function SlackAuthLink({ auth, children, scopes, redirectUri }: Props) {
  return (
    <a href={slackAuth(auth.getOauthState(), scopes, redirectUri)}>
      {children}
    </a>
  );
}

export default inject('auth')(SlackAuthLink);
