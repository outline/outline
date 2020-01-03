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

    // the urlId portion of the url does not include the slugified title
    // we only want to force a re-mount of the document component when the
    // document changes, not when the title does so only this portion is used
    // for the key.
    const urlId = match.params.documentSlug.split('-')[1];

    return <DataLoader key={urlId} {...this.props} />;
  }
}

export default inject('ui')(KeyedDocument);
