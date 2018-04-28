// @flow
import Authentication from './Authentication';
import Integration from './Integration';
import Event from './Event';
import User from './User';
import Team from './Team';
import Collection from './Collection';
import Document from './Document';
import Revision from './Revision';
import ApiKey from './ApiKey';
import View from './View';
import Star from './Star';

const models = {
  Authentication,
  Integration,
  Event,
  User,
  Team,
  Collection,
  Document,
  Revision,
  ApiKey,
  View,
  Star,
};

// based on https://github.com/sequelize/express-example/blob/master/models/index.js
Object.keys(models).forEach(modelName => {
  if ('associate' in models[modelName]) {
    models[modelName].associate(models);
  }
});

export {
  Authentication,
  Integration,
  Event,
  User,
  Team,
  Collection,
  Document,
  Revision,
  ApiKey,
  View,
  Star,
};
