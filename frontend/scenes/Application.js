// @flow
import React from 'react';
import { observer } from 'mobx-react';
import Helmet from 'react-helmet';

@observer class Application extends React.Component {
  static propTypes = {
    children: React.PropTypes.node.isRequired,
  };

  render() {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flex: 1 }}>
        <Helmet
          title="Atlas"
          meta={[
            {
              name: 'viewport',
              content: 'width=device-width, initial-scale=1.0',
            },
          ]}
        />
        {this.props.children}
      </div>
    );
  }
}

export default Application;
