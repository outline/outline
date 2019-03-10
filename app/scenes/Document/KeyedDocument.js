// @flow
import * as React from 'react';
import { inject } from 'mobx-react';
import Document from '.';

class KeyedDocument extends React.Component<*> {
  componentWillUnmount() {
    this.props.ui.clearActiveDocument();
  }

  render() {
    return <Document key={this.props.location.pathname} {...this.props} />;
  }
}

export default inject('ui')(KeyedDocument);
