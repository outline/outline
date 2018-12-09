// @flow
import * as React from 'react';
import styled from 'styled-components';
import OriginalLink from 'rich-markdown-editor/lib/components/Link';
import embeds from '../embeds';
import { fadeIn } from 'shared/styles/animations';

export function canBeEmbedded(node: *, url: ?string) {
  if (!url) return false;

  // $embed$ is a special string that's stored in the Markdown for the link text
  return node.text === '$embed$' || node.text === url;
}

export default class Link extends React.Component<*> {
  get url(): string {
    return this.props.node.data.get('href');
  }

  getMatches(): ?{ component: *, matches: string[] } {
    const keys = Object.keys(embeds);

    for (const key of keys) {
      const component = embeds[key];

      for (const host of component.ENABLED) {
        const matches = this.url.match(host);
        if (matches) return { component, matches };
      }
    }
  }

  render() {
    const url = this.url;
    const result = this.getMatches();
    const EmbedComponent = result ? result.component : undefined;
    const isEmbed = canBeEmbedded(this.props.node, url);

    return isEmbed && EmbedComponent ? (
      <Fade contentEditable={false}>
        <EmbedComponent matches={result ? result.matches : []} url={url} />
      </Fade>
    ) : (
      <OriginalLink {...this.props} />
    );
  }
}

const Fade = styled.div`
  animation: ${fadeIn} 500ms ease-in-out;
  line-height: 0;
`;
