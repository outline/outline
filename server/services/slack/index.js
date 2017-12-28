// @flow
import type { Event } from '../../events';

const Slack = {
  id: 'slack',
  name: 'Slack',
  on: (event: Event) => {
    console.log(`Slack service received ${event.name}`);
    console.log(event.model);
  },
};

export default Slack;
