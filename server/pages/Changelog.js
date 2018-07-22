// @flow
import * as React from 'react';
import format from 'date-fns/format';
import styled from 'styled-components';
import Grid from 'styled-components-grid';
import ReactMarkdown from 'react-markdown';
import { Helmet } from 'react-helmet';
import Header from './components/Header';
import Content from './components/Content';

type Release = {
  id: string,
  name: string,
  body: string,
  created_at: string,
};

function Changelog({ releases }: { releases: Release[] }) {
  return (
    <Grid>
      <Helmet>
        <title>Changelog</title>
      </Helmet>
      <Header>
        <h1>Changelog</h1>
        <p>
          We’re building in public. Here’s what we’ve been changing recently.
        </p>
      </Header>
      <Content>
        {releases.map(release => (
          <Article key={release.id}>
            <Heading id={release.name}>
              <a href={`#${release.name}`}>{release.name}</a>
            </Heading>
            <Time datetime={release.created_at}>
              {format(new Date(release.created_at), 'MMMM Do, YYYY')}
            </Time>
            <ReactMarkdown source={release.body} />
          </Article>
        ))}
      </Content>
    </Grid>
  );
}

const Heading = styled.h1`
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
