import React from 'react';

const injectOffline = WrappedComponent => {
  return class OfflineWrapper extends React.Component {
    static contextTypes = {
      offline: React.PropTypes.bool,
    };

    render() {
      const newProps = {
        offline: this.context.offline,
      };

      return <WrappedComponent {...this.props} {...newProps} />;
    }
  };
};

export default injectOffline;
