// @flow
import React from 'react';
import { observer, inject } from 'mobx-react';
import UserStore from 'stores/UserStore';

@inject('user')
@observer
class SlackAuthLink extends React.Component {
  props: {
    children: any,
    scopes: Array<string>,
    user: UserStore,
    redirectUri: string,
  };

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
      // $FlowIssue global variable
      client_id: SLACK_KEY,
      scope: this.props.scopes.join(' '),
      // $FlowIssue global variable
      redirect_uri: this.props.redirectUri || SLACK_REDIRECT_URI,
      state: this.props.user.getOauthState(),
    };

    const urlParams = Object.keys(params)
      .map(key => {
        return `${key}=${encodeURIComponent(params[key])}`;
      })
      .join('&');

    return `${baseUrl}?${urlParams}`;
  };

  render() {
    return <a href={this.slackUrl()}>{this.props.children}</a>;
  }
}

export default SlackAuthLink;
