// @flow
import * as React from 'react';
import styled from 'styled-components';
import { fadeIn } from 'shared/styles/animations';
import embeds from '../../embeds';

export default class Embed extends React.Component<*> {
  get url(): string {
    return this.props.attrs.href;
  }

  getMatchResults(): ?{ component: *, matches: string[] } {
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
    const result = this.getMatchResults();
    if (!result) return null;

    const { isSelected, children } = this.props;
    const { component, matches } = result;
    const EmbedComponent = component;

    return (
      <Container contentEditable={false} isSelected={isSelected}>
        <EmbedComponent matches={matches} url={this.url} />
        {children}
      </Container>
    );
  }
}

const Container = styled.div`
  text-align: center;
  animation: ${fadeIn} 500ms ease-in-out;
  line-height: 0;

  border-radius: 3px;
  box-shadow: ${props =>
    props.isSelected ? `0 0 0 2px ${props.theme.selected}` : 'none'};
`;
