// @flow
import React, { Component } from 'react';
import { List } from 'immutable';
import headingToSlug from '../headingToSlug';
import type { State, Block } from '../types';
import styled from 'styled-components';

type Props = {
  state: State,
};

class Minimap extends Component {
  props: Props;

  get headings(): List<Block> {
    const { state } = this.props;

    return state.document.nodes.filter((node: Block) => {
      if (!node.text) return false;
      return node.type.match(/^heading/);
    });
  }

  render() {
    return (
      <Wrapper>
        <Headings>
          {this.headings.map(heading => (
            <li>
              <a href={`#${headingToSlug(heading.type, heading.text)}`}>
                {heading.text}
              </a>
            </li>
          ))}
        </Headings>
      </Wrapper>
    );
  }
}

const Headings = styled.ol`
  margin: 0;
  padding: 0;
`;

const Wrapper = styled.div`
  position: fixed;
  left: 0;
  top: 50%;
`;

export default Minimap;
