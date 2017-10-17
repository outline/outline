// @flow
import React, { Component } from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { List } from 'immutable';
import { color } from 'styles/constants';
import headingToSlug from '../headingToSlug';
import type { State, Block } from '../types';
import styled from 'styled-components';

type Props = {
  state: State,
};

@observer class Minimap extends Component {
  props: Props;
  @observable activeHeading: ?string;

  componentDidMount() {
    window.addEventListener('scroll', this.updateActiveHeading);
    this.updateActiveHeading();
  }

  componentWillUnmount() {
    window.removeEventListener('scroll', this.updateActiveHeading);
  }

  updateActiveHeading = () => {
    let activeHeading = this.headingElements[0].id;

    for (const element of this.headingElements) {
      const bounds = element.getBoundingClientRect();
      if (bounds.top <= 0) activeHeading = element.id;
    }

    this.activeHeading = activeHeading;
  };

  get headingElements(): HTMLElement[] {
    const elements = [];
    const tagNames = ['h2', 'h3', 'h4', 'h5', 'h6'];

    for (const tagName of tagNames) {
      for (const ele of document.getElementsByTagName(tagName)) {
        elements.push(ele);
      }
    }

    return elements;
  }

  get headings(): List<Block> {
    const { state } = this.props;

    return state.document.nodes.filter((node: Block) => {
      if (!node.text) return false;
      if (node.type === 'heading1') return false;
      return node.type.match(/^heading/);
    });
  }

  render() {
    // If there are one or less headings in the document no need for a minimap
    if (this.headings.size <= 1) return null;

    return (
      <Wrapper>
        <Sections>
          {this.headings.map(heading => {
            const slug = headingToSlug(heading.type, heading.text);

            return (
              <ListItem type={heading.type}>
                <Anchor href={`#${slug}`} active={this.activeHeading === slug}>
                  {heading.text}
                </Anchor>
              </ListItem>
            );
          })}
        </Sections>
      </Wrapper>
    );
  }
}

const Anchor = styled.a`
  color: ${props => (props.active ? color.primary : color.slate)};
  font-weight: ${props => (props.active ? 500 : 400)};
`;

const ListItem = styled.li`
  position: relative;
  margin-left: ${props => (props.type === 'heading2' ? '8px' : '16px')};
  text-align: right;
  color: ${color.slate};
  padding-right: 10px;
  opacity: 0;
`;

const Sections = styled.ol`
  margin: 0 0 0 -8px;
  padding: 0;
  list-style: none;
  font-size: 13px;
  border-right: 1px solid ${color.slate};

  &:hover {
    ${ListItem} {
      opacity: 1;
    }
  }
`;

const Wrapper = styled.div`
  position: fixed;
  right: 0;
  top: 160px;
  padding-right: 20px;
  background: ${color.white};
  z-index: 100;
`;

export default Minimap;
