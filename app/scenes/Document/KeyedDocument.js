// @flow
import * as React from 'react';
import { inject } from 'mobx-react';
import DataLoader from './components/DataLoader';

class KeyedDocument extends React.Component<*> {
  componentWillUnmount() {
    this.props.ui.clearActiveDocument();
  }

  render() {
    const { match } = this.props;
    const urlId = match.params.documentSlug.split('-')[1];

    return <DataLoader key={urlId} {...this.props} />;
  }
}

export default inject('ui')(KeyedDocument);
