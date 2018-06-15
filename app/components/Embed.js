// @flow
import * as React from 'react';
import styled from 'styled-components';
import embeds from '../embeds';
import { client } from 'utils/ApiClient';

type Props = {
  url: string,
};

type State = {
  expanded: boolean,
  metadata?: Object,
};

class EmbedWrapper extends React.Component<Props, State> {
  state = {
    expanded: true,
  };

  componentDidMount() {
    const embed = this.matchingEmbed;

    if (embed && embed.requestData !== false) {
      this.requestData(this.props.url);
    }
  }

  toggleExpanded = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.setState(state => ({ expanded: !state.expanded }));
  };

  requestData = async (url: string) => {
    const response = await client.post('/embeds.metadata', { url });

    if (response.data) {
      this.setState({ metadata: response.data.metadata });
    }
  };

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
      <EmbedComponent url={this.props.url} metadata={this.state.metadata} />
    );
  }
}

export default EmbedWrapper;
