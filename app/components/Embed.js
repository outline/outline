// @flow
import * as React from 'react';
import embeds from '../embeds';

type Props = {
  url: string,
};

type State = {
  expanded: boolean,
};

export default class EmbedWrapper extends React.Component<Props, State> {
  state = {
    expanded: false,
  };

  toggleExpanded = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.setState(state => ({ expanded: !state.expanded }));
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
    const embed = this.matchingEmbed;
    if (!embed) return null;

    if (!this.state.expanded) {
      return (
        <a contentEditable={false} onClick={this.toggleExpanded}>
          Expand
        </a>
      );
    }

    return (
      <div contentEditable={false}>
        <a onClick={this.toggleExpanded}>Collapse</a>
        {embed.render({ url: this.props.url })}
      </div>
    );
  }
}
