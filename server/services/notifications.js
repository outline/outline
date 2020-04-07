// @flow
import { Op } from '../sequelize';
import type { DocumentEvent, CollectionEvent, Event } from '../events';
import {
  Document,
  Team,
  Collection,
  User,
  NotificationSetting,
} from '../models';
import mailer from '../mailer';

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

  async documentUpdated(event: DocumentEvent) {
    // lets not send a notification on every autosave update
    if (event.data && event.data.autosave) return;

    // wait until the user has finished editing
    if (event.data && !event.data.done) return;

    const document = await Document.findByPk(event.documentId);
    if (!document) return;

    const { collection } = document;
    if (!collection) return;

    const team = await Team.findByPk(document.teamId);
    if (!team) return;

    const notificationSettings = await NotificationSetting.findAll({
      where: {
        userId: {
          [Op.ne]: document.lastModifiedById,
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

    notificationSettings.forEach(setting => {
      // For document updates we only want to send notifications if
      // the document has been edited by the user with this notification setting
      // This could be replaced with ability to "follow" in the future
      if (
        event.name === 'documents.update' &&
        !document.collaboratorIds.includes(setting.userId)
      ) {
        return;
      }

      mailer.documentNotification({
        to: setting.user.email,
        eventName,
        document,
        team,
        collection,
        actor: document.updatedBy,
        unsubscribeUrl: setting.unsubscribeUrl,
      });
    });
  }

  async collectionCreated(event: CollectionEvent) {
    const collection = await Collection.findByPk(event.collectionId, {
      include: [
        {
          model: User,
          required: true,
          as: 'user',
        },
      ],
    });
    if (!collection) return;
    if (collection.private) return;

    const notificationSettings = await NotificationSetting.findAll({
      where: {
        userId: {
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
        actor: collection.user,
        unsubscribeUrl: setting.unsubscribeUrl,
      })
    );
  }
}
