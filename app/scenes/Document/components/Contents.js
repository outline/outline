// @flow
import * as React from 'react';
import { darken } from 'polished';
import useWindowScrollPosition from '@rehooks/window-scroll-position';
import styled from 'styled-components';
import Document from 'models/Document';

const HEADING_OFFSET = 20;

type Props = {
  document: Document,
};

export default function Contents({ document }: Props) {
  const headings = document.headings;

  // $FlowFixMe
  const [activeSlug, setActiveSlug] = React.useState();
  const position = useWindowScrollPosition({ throttle: 100 });

  // $FlowFixMe
  React.useEffect(
    () => {
      const keys = Object.keys(headings);

      for (const key of keys) {
        const heading = headings[key];
        const element = window.document.getElementById(
          decodeURIComponent(heading.slug)
        );

        if (element) {
          const bounding = element.getBoundingClientRect();
          if (bounding.top > HEADING_OFFSET) {
            const last = headings[Math.max(0, key - 1)];
            setActiveSlug(last.slug);
            break;
          }
        }
      }
    },
    [position]
  );

  return (
    <div>
      <Wrapper>
        <Heading>Contents</Heading>
        <List>
          {headings.map(heading => (
            <ListItem
              level={heading.level}
              active={activeSlug === heading.slug}
            >
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
  min-height: 40px;
`;

const ListItem = styled('li')`
  margin-left: ${props => (props.level - 1) * 10}px;
  margin-bottom: 4px;
  padding-right: 2em;
  border-right: 3px solid
    ${props => (props.active ? props.theme.textSecondary : 'transparent')};
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
