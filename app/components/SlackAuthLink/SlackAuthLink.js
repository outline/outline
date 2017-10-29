// @flow
import React from 'react';
import { observer, inject } from 'mobx-react';
import AuthStore from 'stores/AuthStore';

type Props = {
  children: React$Element<*>,
  scopes?: string[],
  auth: AuthStore,
  redirectUri: string,
};

@observer class SlackAuthLink extends React.Component {
  props: Props;

  static defaultProps = {
    scopes: [
      'identity.email',
      'identity.basic',
      'identity.avatar',
      'identity.team',
    ],
  };

  slackUrl = () => {
    const baseUrl = 'https://slack.com/oauth/authorize';
    const params = {
      client_id: SLACK_KEY,
      scope: this.props.scopes ? this.props.scopes.join(' ') : '',
      redirect_uri: this.props.redirectUri || SLACK_REDIRECT_URI,
      state: this.props.auth.getOauthState(),
    };

    const urlParams = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');

    return `${baseUrl}?${urlParams}`;
  };

  render() {
    return <a href={this.slackUrl()}>{this.props.children}</a>;
  }
}

export default inject('auth')(SlackAuthLink);
