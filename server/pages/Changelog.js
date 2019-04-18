// @flow
import * as React from 'react';
import { Helmet } from 'react-helmet';
import { groupBy, map } from 'lodash';
import format from 'date-fns/format';
import styled from 'styled-components';
import Grid from 'styled-components-grid';
import PageTitle from './components/PageTitle';
import Markdown from './components/Markdown';
import Header from './components/Header';
import Content from './components/Content';

type Release = {
  id: string,
  name: string,
  body: string,
  created_at: string,
};

type Props = { releases: Release[] };

function Changelog({ releases }: Props) {
  const categories = groupBy(releases, i =>
    format(new Date(i.created_at), 'MMMM, YYYY')
  );

  return (
    <Grid>
      <Helmet>
        <link
          rel="alternate"
          type="application/atom+xml"
          title="Release Notes"
          href="https://github.com/outline/outline/releases.atom"
        />
      </Helmet>
      <PageTitle title="Changelog" />
      <Header background="#00ADFF">
        <h1>Changelog</h1>
        <p>We’re building in public. Here’s what has changed recently.</p>
      </Header>
      <Content>
        <Grid>
          <Grid.Unit
            size={{ tablet: 1 / 4 }}
            visible={{ mobile: false, tablet: true }}
          >
            <nav>
              {map(categories, (releases, category) => (
                <React.Fragment key={category}>
                  <h3>{category.split(',')[0]}</h3>
                  <List>
                    {releases.map(release => (
                      <li key={release.id}>
                        <MenuItem href={`#${release.name}`}>
                          {release.name}
                        </MenuItem>
                      </li>
                    ))}
                  </List>
                </React.Fragment>
              ))}
            </nav>
          </Grid.Unit>
          <Grid.Unit size={{ tablet: 3 / 4 }}>
            {releases.map(release => (
              <Article key={release.id}>
                <Heading id={release.name}>
                  <a href={`#${release.name}`}>{release.name}</a>
                </Heading>
                <Time dateTime={release.created_at}>
                  {format(new Date(release.created_at), 'MMMM Do, YYYY')}
                </Time>
                <Markdown source={release.body} />
              </Article>
            ))}
          </Grid.Unit>
        </Grid>
      </Content>
    </Grid>
  );
}

const MenuItem = styled.a`
  display: flex;
  align-items: center;
  font-size: 16px;
  color: ${props => props.theme.text};
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const Heading = styled.h1`
  margin-top: 0.5em;

  a {
    color: ${props => props.theme.text};
  }

  a:hover {
    text-decoration: underline;
  }
`;

const Time = styled.time`
  color: ${props => props.theme.slateDark};
  margin-top: -16px;
  display: block;
`;

const Article = styled.div`
  border-bottom: 1px solid ${props => props.theme.slateLight};
  padding-bottom: 2em;

  &:last-child {
    border-bottom: 0;
  }
`;

export default Changelog;
