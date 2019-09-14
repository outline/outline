// @flow
import ApiKey from './ApiKey';
import Authentication from './Authentication';
import Backlink from './Backlink';
import Collection from './Collection';
import CollectionUser from './CollectionUser';
import Document from './Document';
import Event from './Event';
import Integration from './Integration';
import Notification from './Notification';
import NotificationSetting from './NotificationSetting';
import Revision from './Revision';
import Share from './Share';
import Star from './Star';
import Team from './Team';
import User from './User';
import View from './View';

const models = {
  ApiKey,
  Authentication,
  Backlink,
  Collection,
  CollectionUser,
  Document,
  Event,
  Integration,
  Notification,
  NotificationSetting,
  Revision,
  Share,
  Star,
  Team,
  User,
  View,
};

// based on https://github.com/sequelize/express-example/blob/master/models/index.js
Object.keys(models).forEach(modelName => {
  if ('associate' in models[modelName]) {
    models[modelName].associate(models);
  }
});

export {
  ApiKey,
  Authentication,
  Backlink,
  Collection,
  CollectionUser,
  Document,
  Event,
  Integration,
  Notification,
  NotificationSetting,
  Revision,
  Share,
  Star,
  Team,
  User,
  View,
};
