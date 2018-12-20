// @flow
import { map, groupBy } from 'lodash';
import * as React from 'react';

export default function IntegrationMenu({ integrations }) {
  const categories = groupBy(integrations, i => i.category);

  return (
    <nav>
      {map(categories, (integrations, category) => (
        <React.Fragment>
          <h3>{category}</h3>
          <ul>
            {integrations.map(i => (
              <li>
                <a href={`/integrations/${i.slug}`}>{i.name}</a>
              </li>
            ))}
          </ul>
        </React.Fragment>
      ))}
    </nav>
  );
}
