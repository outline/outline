import React from 'react';
import { observer } from 'mobx-react';
import Helmet from 'react-helmet';

@observer class Application extends React.Component {
  static childContextTypes = {
    rebass: React.PropTypes.object,
  };

  static propTypes = {
    children: React.PropTypes.node.isRequired,
  };

  getChildContext() {
    return {
      rebass: {
        colors: {
          primary: '#171B35',
        },
        // color: '#eee',
        // backgroundColor: '#fff',
        borderRadius: 2,
        borderColor: '#eee',

        // fontSizes: [64, 48, 28, 20, 18, 16, 14],
        bold: 500,
        scale: [0, 8, 18, 36, 72],
        Input: {
          // borderBottom: '1px solid #eee',
        },
        Button: {
          // color: '#eee',
          // backgroundColor: '#fff',
          // border: '1px solid #ccc',
        },
        ButtonOutline: {
          color: '#000',
        },
        InlineForm: {},
      },
    };
  }

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
