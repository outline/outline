import React from 'react';
import { observe } from 'mobx'
import store from 'stores/UserStore';

import styles from './SlackAuthLink.scss';

class SlackAuthLink extends React.Component {
  static propTypes = {
    scopes: React.PropTypes.arrayOf(React.PropTypes.string),
  }

  static defaultProps = {
    scopes: [
      'identity.email',
      'identity.basic',
      'identity.avatar',
      'identity.team',
    ]
  }

  slackUrl = () => {
    const baseUrl = 'https://slack.com/oauth/authorize';
    const params = {
      client_id: '30086650419.30130733398',
      scope: this.props.scopes.join(" "),
      redirect_uri: __DEV__ ?
          'http://localhost:3000/auth/slack/' :
          'https://www.beautifulatlas.com/auth/slack/',
      state: store.getOauthState(),
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

export default SlackAuthLink;
