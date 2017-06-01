// @flow
import User from './User';
import Team from './Team';
import Collection from './Collection';
import Document from './Document';
import Revision from './Revision';
import ApiKey from './ApiKey';
import View from './View';

const models = { User, Team, Collection, Document, Revision, ApiKey, View };

// based on https://github.com/sequelize/express-example/blob/master/models/index.js
Object.keys(models).forEach(modelName => {
  if ('associate' in models[modelName]) {
    models[modelName].associate(models);
  }
});

export { User, Team, Collection, Document, Revision, ApiKey, View };
