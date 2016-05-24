import React from 'react';

import styles from './SlackAuthLink.scss';

export default class SlackAuthLink extends React.Component {
  static propTypes = {
    scopes: React.PropTypes.arrayOf(React.PropTypes.string),
  }

  state = {
    oauthState: Math.random().toString(36).substring(7),
  }

  static defaultProps = {
    scopes: ['identify']
  }

  componentDidMount = () => {
    localStorage.oauthState = this.state.oauthState;
  }

  slackUrl = () => {
    const baseUrl = 'https://slack.com/oauth/authorize';
    const params = {
      client_id: '30086650419.30130733398',
      scope: this.props.scopes.join(" "),
      redirect_uri: __DEV__ ?
          'http://localhost:3000/auth/slack/' :
          'https://beautifulatlas.herokuapp.com/auth/slack/',
      state: this.state.oauthState,
    };

    const urlParams = Object.keys(params).map(function(key) {
        return key + '=' + encodeURIComponent(params[key]);
    }).join('&');

    return `${baseUrl}?${urlParams}`;
  }

  render() {
    return (
      <a href={ this.slackUrl() } className={ styles.link }>Authorize /w Slack</a>
    )
  }
}
