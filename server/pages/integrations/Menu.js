// @flow
import * as React from 'react';
import styled from 'styled-components';
import { map, groupBy } from 'lodash';

type Props = {
  integrations: *,
  active: string,
};

export default function IntegrationMenu({ integrations, active }: Props) {
  const categories = groupBy(integrations, i => i.category);

  return (
    <nav>
      {map(categories, (integrations, category) => (
        <React.Fragment key={category}>
          <h3>{category}</h3>
          <List>
            {integrations.map(i => (
              <li key={i.slug}>
                <MenuItem
                  href={`/integrations/${i.slug}`}
                  active={i.slug === active}
                >
                  <Logo src={`/images/${i.slug}.png`} alt={i.name} />
                  <span>{i.name}</span>
                </MenuItem>
              </li>
            ))}
          </List>
        </React.Fragment>
      ))}
    </nav>
  );
}

const MenuItem = styled.a`
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: ${props => (props.active ? '600' : 'inherit')};
  color: ${props => props.theme.text};
`;

const Logo = styled.img`
  user-select: none;
  height: 18px;
  border-radius: 2px;
  margin-right: 8px;
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;
