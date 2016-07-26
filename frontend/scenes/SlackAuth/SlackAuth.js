import React from 'react';
import { observer } from 'mobx-react';

@observer(['user'])
class SlackAuth extends React.Component {
  static propTypes = {
    user: React.PropTypes.object.isRequired,
    location: React.PropTypes.object.isRequired,
  }

  componentDidMount = () => {
    const { code, state } = this.props.location.query;
    this.props.user.authWithSlack(code, state);
  }

  render() {
    return (
      <div></div>
    );
  }
}

export default SlackAuth;
