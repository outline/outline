// @flow
import * as React from 'react';
import styled from 'styled-components';
import embeds from '../embeds';

type Props = {
  url: string,
};

class EmbedWrapper extends React.Component<Props> {
  shouldComponentUpdate(nextProps: Props) {
    return nextProps.url !== this.props.url;
  }

  get hostname() {
    try {
      const parsed = new URL(this.props.url);
      return parsed.hostname.replace(/^www\./, '');
    } catch (err) {
      return '';
    }
  }

  get matchingEmbed() {
    const keys = Object.keys(embeds);

    for (const key of keys) {
      const embed = embeds[key];
      if (embed.hostnames.includes(this.hostname)) {
        return embed;
      }
    }
  }

  render() {
    const EmbedComponent = this.matchingEmbed;
    if (!EmbedComponent) return null;

    return (
      <Background contentEditable={false}>
        <EmbedComponent url={this.props.url} />
      </Background>
    );
  }
}

const Background = styled.div`
  line-height: 0;
`;

export default EmbedWrapper;
