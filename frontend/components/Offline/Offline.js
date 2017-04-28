import React from 'react';

class Offline extends React.Component {
  static propTypes = {
    children: React.PropTypes.node,
  };

  static childContextTypes = {
    offline: React.PropTypes.bool,
  };

  state = {
    offline: !navigator.onLine,
  };

  getChildContext() {
    return {
      offline: this.state.offline,
    };
  }

  componentDidMount = () => {
    window.addEventListener('offline', this.handleConnectionState);
    window.addEventListener('online', this.handleConnectionState);
  };

  componentWillUnmount = () => {
    window.removeEventListener('offline', this.handleConnectionState);
    window.removeEventListener('online', this.handleConnectionState);
  };

  handleConnectionState = () => {
    this.setState({
      offline: !navigator.onLine,
    });
  };

  render() {
    return React.Children.only(this.props.children);
  }
}

export default Offline;
