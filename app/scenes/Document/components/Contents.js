// @flow
import * as React from 'react';
import { darken } from 'polished';
import breakpoint from 'styled-components-breakpoint';
import useWindowScrollPosition from '@rehooks/window-scroll-position';
import HelpText from 'components/HelpText';
import styled from 'styled-components';
import Document from 'models/Document';
import Revision from 'models/Revision';

const HEADING_OFFSET = 20;

type Props = {
  document: Revision | Document,
};

export default function Contents({ document }: Props) {
  const headings = document.headings;

  // $FlowFixMe
  const [activeSlug, setActiveSlug] = React.useState();
  const position = useWindowScrollPosition({ throttle: 100 });

  // $FlowFixMe
  React.useEffect(
    () => {
      for (let key = 0; key < headings.length; key++) {
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
        {headings.length ? (
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
        ) : (
          <Empty>Headings you add to the document will appear here</Empty>
        )}
      </Wrapper>
    </div>
  );
}

const Wrapper = styled('div')`
  display: none;
  position: sticky;
  top: 80px;

  box-shadow: 1px 0 0 ${props => darken(0.05, props.theme.sidebarBackground)};
  margin-top: 40px;
  margin-right: 2em;
  min-height: 40px;

  ${breakpoint('desktopLarge')`
    margin-left: -16em;
  `};

  ${breakpoint('tablet')`
    display: block;
  `};
`;

const Heading = styled('h3')`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${props => props.theme.sidebarText};
  letter-spacing: 0.04em;
`;

const Empty = styled(HelpText)`
  margin: 1em 0 4em;
  padding-right: 2em;
  min-width: 16em;
  width: 16em;
  font-size: 14px;
`;

const ListItem = styled('li')`
  margin-left: ${props => (props.level - 1) * 10}px;
  margin-bottom: 8px;
  padding-right: 2em;
  line-height: 1.3;
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
  width: 14em;
  padding: 0;
  list-style: none;
`;
