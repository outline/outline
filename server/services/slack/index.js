// @flow
import type { Event } from '../../events';
import { Document, Integration } from '../../models';
import { presentSlackAttachment } from '../../presenters';

const Slack = {
  on: async (event: Event) => {
    if (event.name !== 'documents.publish' && event.name !== 'documents.update')
      return;

    const document = await Document.findById(event.model.id);
    if (!document) return;

    const integration = await Integration.findOne({
      where: {
        teamId: document.teamId,
        serviceId: 'slack',
        collectionId: document.atlasId,
        type: 'post',
      },
    });
    if (!integration) return;

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
  },
};

export default Slack;
