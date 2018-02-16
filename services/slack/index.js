// @flow
import type { Event } from '../../server/events';
import { Document, Integration } from '../../server/models';
import { presentSlackAttachment } from '../../server/presenters';

const Slack = {
  on: async (event: Event) => {
    if (event.name !== 'documents.create' && event.name !== 'documents.update')
      return;

    const document = await Document.findById(event.model.id);
    const integration = await Integration.findOne({
      where: {
        teamId: document.teamId,
        serviceId: 'slack',
        collectionId: document.atlasId,
        type: 'post',
      },
    });
    console.log(integration);

    if (integration) {
      let text = `${document.createdBy.name} published a new document`;

      if (event.name === 'documents.update') {
        text = `${document.createdBy.name} updated a document`;
      }

      await fetch(integration.settings.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          attachments: [presentSlackAttachment(document)],
        }),
      });
    }
  },
};

export default Slack;
