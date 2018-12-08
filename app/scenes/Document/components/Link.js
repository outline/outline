// @flow
import * as React from 'react';
import Embed from 'components/Embed';
import OriginalLink from 'rich-markdown-editor/lib/components/Link';

export default class Link extends React.Component<*> {
  render() {
    const { node } = this.props;
    const href = node.data.get('href');

    // $embed$ is a special string that's stored in the Markdown for the link text
    const isEmbedded = node.text === '$embed$' || node.text === href;
    return isEmbedded ? <Embed url={href} /> : <OriginalLink {...this.props} />;
  }
}
