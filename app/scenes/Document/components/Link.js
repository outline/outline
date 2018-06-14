// @flow
import * as React from 'react';
import Embed from 'components/Embed';
import type { SlateNodeProps as Props } from '../../../types';

export default class Link extends React.Component<Props> {
  render() {
    const { attributes, node, children, editor, readOnly } = this.props;
    const href = node.data.get('href');

    // $embed$ is a special string that's stored in the Markdown for the link text
    const showEmbed = node.text === '$embed$' || node.text === href;

    return showEmbed ? (
      <Embed url={href} />
    ) : (
      <React.Fragment>
        <a
          {...attributes}
          href={readOnly ? href : undefined}
          onClick={
            readOnly
              ? ev => {
                  if (editor.props.onClickLink) {
                    ev.preventDefault();
                    editor.props.onClickLink(href);
                  }
                }
              : undefined
          }
          target="_blank"
        >
          {children}
        </a>
      </React.Fragment>
    );
  }
}
