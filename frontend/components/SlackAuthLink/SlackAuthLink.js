import React from 'react';
import { observer, inject } from 'mobx-react';

@inject('user')
@observer
class SlackAuthLink extends React.Component {
  static propTypes = {
    children: React.PropTypes.node.isRequired,
    scopes: React.PropTypes.arrayOf(React.PropTypes.string),
    user: React.PropTypes.object.isRequired,
    redirectUri: React.PropTypes.string,
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
      client_id: SLACK_KEY,
      scope: this.props.scopes.join(' '),
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
