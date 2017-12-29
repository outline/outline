// @flow
import type { Event } from '../../server/events';

export default {
  on: (event: Event) => {
    console.log(`Slack service received ${event.name}, id: ${event.model.id}`);
  },
};
