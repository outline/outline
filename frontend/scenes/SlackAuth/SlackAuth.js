import React from 'react';
import { observer } from 'mobx-react';
import { browserHistory } from 'react-router';
import { client } from 'utils/ApiClient';

@observer(['user'])
class SlackAuth extends React.Component {
  static propTypes = {
    user: React.PropTypes.object.isRequired,
    location: React.PropTypes.object.isRequired,
    route: React.PropTypes.object.isRequired,
  }

  componentDidMount = async () => {
    const { error, code, state } = this.props.location.query;

    if (error) {
      if (error === 'access_denied') {
        // User selected "Deny" access on Slack OAuth
        browserHistory.push('/');
      } else {
        browserHistory.push('/auth/error');
      }
      return;
    }

    if (this.props.route.apiPath) {
      try {
        await client.post(this.props.route.apiPath, { code });
        browserHistory.replace('/dashboard');
      } catch (e) {
        browserHistory.push('/auth-error');
        return;
      }
    } else {
      // Regular Slack authentication
      this.props.user.authWithSlack(code, state);
    }
  }

  render() {
    return (
      <div></div>
    );
  }
}

export default SlackAuth;
