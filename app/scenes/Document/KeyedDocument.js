// @flow
import * as React from 'react';
import { inject } from 'mobx-react';
import DataLoader from './components/DataLoader';

class KeyedDocument extends React.Component<*> {
  componentWillUnmount() {
    this.props.ui.clearActiveDocument();
  }

  render() {
    return (
      <DataLoader key={this.props.match.params.documentSlug} {...this.props} />
    );
  }
}

export default inject('ui')(KeyedDocument);
