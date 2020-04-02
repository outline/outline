// @flow
import * as React from 'react';
import { darken } from 'polished';
import styled from 'styled-components';
import Document from 'models/Document';

type Props = {
  document: Document,
};

export default function Contents({ document }: Props) {
  return (
    <div>
      <Wrapper>
        <Heading>Contents</Heading>
        <List>
          {document.headings.map(heading => (
            <ListItem level={heading.level}>
              <Link href={`#${heading.slug}`}>{heading.title}</Link>
            </ListItem>
          ))}
        </List>
      </Wrapper>
    </div>
  );
}

const Heading = styled('h3')`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${props => props.theme.sidebarText};
  letter-spacing: 0.04em;
`;

const Wrapper = styled('div')`
  position: sticky;
  top: 80px;

  box-shadow: 1px 0 0 ${props => darken(0.05, props.theme.sidebarBackground)};
  margin-top: 40px;
  margin-right: 2em;
  padding-right: 2em;
`;

const ListItem = styled('li')`
  margin-left: ${props => (props.level - 1) * 10}px;
`;

const Link = styled('a')`
  color: ${props => props.theme.text};
  font-size: 14px;

  &:hover {
    color: ${props => props.theme.primary};
  }
`;

const List = styled('ol')`
  min-width: 14em;
  padding: 0;
  list-style: none;
`;
