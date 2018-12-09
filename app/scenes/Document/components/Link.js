// @flow
import * as React from 'react';
import styled from 'styled-components';
import OriginalLink from 'rich-markdown-editor/lib/components/Link';
import embeds from '../../../embeds';

export default class Link extends React.Component<*> {
  shouldComponentUpdate() {
    return false;
  }

  get url(): string {
    return this.props.node.data.get('href');
  }

  get hostname() {
    try {
      const parsed = new URL(this.url);
      return parsed.hostname.replace(/^www\./, '');
    } catch (err) {
      return '';
    }
  }

  get matchingEmbed() {
    const keys = Object.keys(embeds);

    for (const key of keys) {
      const embed = embeds[key];

      for (const host of embed.hostnames) {
        if (typeof host === 'object') {
          if (this.url.match(host)) return embed;
        } else {
          if (host === this.hostname) return embed;
        }
      }
    }
  }

  render() {
    const { node } = this.props;

    // $embed$ is a special string that's stored in the Markdown for the link text
    const url = this.url;
    const canBeEmbed = node.text === '$embed$' || node.text === url;
    const EmbedComponent = this.matchingEmbed;
    const isEmbed = canBeEmbed && url;

    return isEmbed && EmbedComponent ? (
      <Background contentEditable={false}>
        <EmbedComponent url={url} />
      </Background>
    ) : (
      <OriginalLink {...this.props} />
    );
  }
}

const Background = styled.div`
  line-height: 0;
`;
