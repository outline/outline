// @flow
import { inject } from "mobx-react";
import * as React from "react";
import DataLoader from "./components/DataLoader";

class KeyedDocument extends React.Component<*> {
  componentWillUnmount() {
    this.props.ui.clearActiveDocument();
  }

  render() {
    const { documentSlug, revisionId } = this.props.match.params;

    // the urlId portion of the url does not include the slugified title
    // we only want to force a re-mount of the document component when the
    // document changes, not when the title does so only this portion is used
    // for the key.
    const urlParts = documentSlug ? documentSlug.split("-") : [];
    const urlId = urlParts.length ? urlParts[urlParts.length - 1] : undefined;

    return <DataLoader key={[urlId, revisionId].join("/")} {...this.props} />;
  }
}

export default inject("ui")(KeyedDocument);
