// @flow
import * as React from 'react';
import { map, groupBy } from 'lodash';
import styled from 'styled-components';
import Grid from 'styled-components-grid';
import { Helmet } from 'react-helmet';
import Header from './components/Header';
import Content from './components/Content';
import integrations from '../config/integrations';

const categories = groupBy(integrations, i => i.category);

function Integrations() {
  return (
    <Grid>
      <Helmet>
        <title>Integrations</title>
      </Helmet>
      <Header background="#FFB500">
        <h1>Integrations</h1>
        <p>
          Outline is designed to integrate with your existing workflow and
          tools.
        </p>
      </Header>
      <Content>
        {map(categories, (integrations, category) => (
          <div key={category}>
            <h2>{category}</h2>
            <Category>
              {integrations.map(i => (
                <Grid.Unit size={{ desktop: 1 / 4 }} key={i.slug}>
                  <Integration href={`/integrations/${i.slug}`}>
                    <Logo src={`/images/${i.slug}.png`} alt={i.name} />
                    <h3>{i.name}</h3>
                    <p>{i.description}</p>
                  </Integration>
                </Grid.Unit>
              ))}
            </Category>
          </div>
        ))}
      </Content>
    </Grid>
  );
}

const Logo = styled.img`
  height: 60px;
  border-radius: 4px;
`;

const Category = styled(Grid)`
  margin: 0 -1em;
`;

const Integration = styled.a`
  display: block;
  padding: 2em 2em 1em;
  margin: 1em;
  border-radius: 4px;
  border: 2px solid ${props => props.theme.slateLight};
  color: ${props => props.theme.text};
  font-size: 16px;
  transition: background 200ms ease-in-out;

  h3,
  p {
    margin: 0.5em 0;
  }

  &:hover {
    background: ${props => props.theme.slateLight};
  }
`;

export default Integrations;
