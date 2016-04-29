import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { slackAuthAsync } from '../../actions/SlackAuthAction';

import { client } from '../../utils/ApiClient';

class SlackAuth extends React.Component {
  componentDidMount = () => {
    const { query } = this.props.location

    // Validate OAuth2 state param
    if (localStorage.oauthState != query.state) {
      return;
    }

    this.props.slackAuthAsync(query.code);
  }

  render() {
    return (
      <div>Loading...</div>
    );
  }
}

const mapDispactcToProps = (dispatch) => {
  return bindActionCreators({ slackAuthAsync }, dispatch);
};

export default connect(
  null,
  mapDispactcToProps
)(SlackAuth);