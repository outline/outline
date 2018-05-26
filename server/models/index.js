// @flow
import ApiKey from './ApiKey';
import Authentication from './Authentication';
import Collection from './Collection';
import Document from './Document';
import Event from './Event';
import Integration from './Integration';
import Revision from './Revision';
import Share from './Share';
import Star from './Star';
import Team from './Team';
import User from './User';
import View from './View';

const models = {
  ApiKey,
  Authentication,
  Collection,
  Document,
  Event,
  Integration,
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
  Collection,
  Document,
  Event,
  Integration,
  Revision,
  Share,
  Star,
  Team,
  User,
  View,
};
