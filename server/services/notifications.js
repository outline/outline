// @flow
import { Op } from '../sequelize';
import type { Event } from '../events';
import { Document, Collection, User, NotificationSetting } from '../models';
import Mailer from '../mailer';

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

    const notificationSettings = await NotificationSetting.findAll({
      where: {
        userId: {
          // $FlowFixMe
          [Op.ne]: document.updatedBy.id,
        },
        teamId: document.teamId,
        event: event.name,
      },
      include: [
        {
          model: User,
          required: true,
          as: 'user',
        },
      ],
    });

    const eventName =
      event.name === 'documents.publish' ? 'published' : 'updated';

    notificationSettings.forEach(setting =>
      mailer.documentNotification({
        to: setting.user.email,
        eventName,
        document,
        collection,
        actor: document.updatedBy,
      })
    );
  }

  async collectionCreated(event: Event) {
    const collection = await Collection.findById(event.model.id);
    if (!collection) return;

    const notificationSettings = await NotificationSetting.findAll({
      where: {
        userId: {
          // $FlowFixMe
          [Op.ne]: collection.createdById,
        },
        teamId: collection.teamId,
        event: event.name,
      },
      include: [
        {
          model: User,
          required: true,
          as: 'user',
        },
      ],
    });

    notificationSettings.forEach(setting =>
      mailer.collectionNotification({
        to: setting.user.email,
        eventName: 'created',
        collection,
        actor: collection.createdBy,
      })
    );
  }
}
