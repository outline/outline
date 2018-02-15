// @flow
import type { Event } from '../../server/events';
import { Document, Integration } from '../../server/models';
import { presentSlackAttachment } from '../../server/presenters';

const Slack = {
  on: async (event: Event) => {
    console.log(`Slack service received ${event.name}, id: ${event.model.id}`);
    if (event.name !== 'documents.create') return;
    const document = await Document.findById(event.model.id);
    console.log(document.teamId);

    const integration = await Integration.findOne({
      where: {
        teamId: document.teamId,
        serviceId: 'slack',
        type: 'post',
      },
    });
    if (integration) {
      console.log(integration.toJSON());
      const attachments = [presentSlackAttachment(document)];
      console.log('attachments', attachments);

      await fetch(integration.settings.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `${document.createdBy.name} created a new document`,
          attachments,
        }),
      });
    }
  },
};

export default Slack;
