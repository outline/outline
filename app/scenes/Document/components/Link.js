// @flow
import * as React from 'react';
import type { SlateNodeProps as Props } from '../../../types';

type State = {
  expanded: boolean,
};

const youtube = /(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)\&?/i;

const renderEmbedForUrl = (url: string) => {
  const matches = url.match(youtube);

  if (matches) {
    const videoId = matches[1];
    return (
      <iframe
        id="player"
        type="text/html"
        width="640"
        height="390"
        src={`http://www.youtube.com/embed/${videoId}`}
        frameBorder="0"
        title={`youtube-${videoId}`}
      />
    );
  }
};

export default class Link extends React.Component<Props, State> {
  state = {
    expanded: false,
  };

  toggleExpanded = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.setState(state => ({ expanded: !state.expanded }));
  };

  render() {
    const { attributes, node, children, editor, readOnly } = this.props;

    const href = node.data.get('href');
    const embed = renderEmbedForUrl(href);

    return (
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
        {embed && (
          <a onClick={this.toggleExpanded}>
            {this.state.expanded ? ' HIDE' : ' EXPAND'}
          </a>
        )}
        {this.state.expanded ? (
          <div contentEditable={false}>{embed}</div>
        ) : (
          undefined
        )}
      </React.Fragment>
    );
  }
}
