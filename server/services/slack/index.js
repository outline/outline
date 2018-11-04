// @flow
import type { Event } from '../../events';
import { Document, Integration, Collection } from '../../models';
import { presentSlackAttachment } from '../../presenters';

class Slack {
  on = async (event: Event) => {
    switch (event.name) {
      case 'documents.publish':
      case 'documents.update':
        return this.documentUpdated(event);
      case 'integrations.create':
        return this.integrationCreated(event);
      default:
    }
  };

  integrationCreated = async (event: Event) => {
    const integration = await Integration.findOne({
      where: {
        id: event.model.id,
        service: 'slack',
        type: 'post',
      },
      include: [
        {
          model: Collection,
          required: true,
          as: 'collection',
        },
      ],
    });
    if (!integration) return;

    const collection = integration.collection;
    if (!collection) return;

    await fetch(integration.settings.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: `👋 Hey there! When documents are published or updated in the *${
          collection.name
        }* collection on Outline they will be posted to this channel!`,
        attachments: [
          {
            color: collection.color,
            title: collection.name,
            title_link: `${process.env.URL}${collection.url}`,
            text: collection.description,
          },
        ],
      }),
    });
  };

  documentUpdated = async (event: Event) => {
    const document = await Document.findById(event.model.id);
    if (!document) return;

    const integration = await Integration.findOne({
      where: {
        teamId: document.teamId,
        collectionId: document.collectionId,
        service: 'slack',
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
  };
}

export default new Slack();
