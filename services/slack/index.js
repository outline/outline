// @flow
import type { Event } from '../../server/events';

const Slack = {
  on: (event: Event) => {
    // console.log(`Slack service received ${event.name}, id: ${event.model.id}`);
  },
};

export default Slack;
