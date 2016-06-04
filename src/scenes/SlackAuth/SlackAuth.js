import React from 'react';
import store from 'stores/UserStore';

export default class SlackAuth extends React.Component {
  componentDidMount = () => {
    const { code, state } = this.props.location.query;
    store.authWithSlack(code, state);
  }

  render() {
    return (
      <div></div>
    );
  }
}
