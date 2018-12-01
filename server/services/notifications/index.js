// @flow
import type { Event } from '../../events';
import { Document, Collection, User, NotificationSetting } from '../../models';
import Mailer from '../../mailer';

const mailer = new Mailer();

export default class Notifications {
  async on(event: Event) {
    switch (event.name) {
      case 'documents.publish':
      case 'documents.update':
        return this.documentUpdated(event);
      case 'collections.create':
        return this.collectionCreated(event);
      default:
    }
  }

  async documentUpdated(event: Event) {
    const document = await Document.findById(event.model.id);
    if (!document) return;

    const { collection } = document;
    if (!collection) return;

    const notificationSettings = await NotificationSetting.find({
      where: {
        teamId: document.teamId,
        event: event.name,
      },
      include: [
        {
          model: User,
          required: true,
        },
      ],
    });

    const eventName =
      event.name === 'documents.publish' ? 'published' : 'updated';

    for (const setting of notificationSettings) {
      mailer.documentNotification({
        to: setting.user.email,
        eventName,
        document,
        collection,
        actor: document.updatedBy,
      });
    }
  }

  async collectionCreated(event: Event) {
    const collection = await Collection.findById(event.model.id);
    if (!collection) return;

    const notificationSettings = await NotificationSetting.find({
      where: {
        teamId: collection.teamId,
        event: event.name,
      },
      include: [
        {
          model: User,
          required: true,
        },
      ],
    });

    for (const setting of notificationSettings) {
      mailer.collectionNotification({
        to: setting.user.email,
        collection,
        actor: collection.createdBy,
      });
    }
  }
}
