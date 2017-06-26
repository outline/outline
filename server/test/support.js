// @flow
import { User, Document, Collection, Team } from '../models';
import { sequelize } from '../sequelize';

export function flushdb() {
  const sql = sequelize.getQueryInterface();
  const tables = Object.keys(sequelize.models).map(model =>
    sql.quoteTable(sequelize.models[model].getTableName())
  );

  const query = `TRUNCATE ${tables.join(', ')} CASCADE`;
  return sequelize.query(query);
}

const seed = async () => {
  const team = await Team.create({
    id: '86fde1d4-0050-428f-9f0b-0bf77f8bdf61',
    name: 'Team',
    slackId: 'T2399UF2P',
    slackData: {
      id: 'T2399UF2P',
    },
  });

  const user = await User.create({
    id: '86fde1d4-0050-428f-9f0b-0bf77f8bdf61',
    email: 'user1@example.com',
    username: 'user1',
    name: 'User 1',
    password: 'test123!',
    teamId: team.id,
    slackId: 'U2399UF2P',
    slackData: {
      id: 'U2399UF2P',
      image_192: 'http://example.com/avatar.png',
    },
  });

  const collection = await Collection.create({
    id: '86fde1d4-0050-428f-9f0b-0bf77f8bdf61',
    name: 'Collection',
    urlId: 'collection',
    teamId: team.id,
    creatorId: user.id,
    type: 'atlas',
  });

  const document = await Document.create({
    parentDocumentId: null,
    atlasId: collection.id,
    teamId: collection.teamId,
    userId: collection.creatorId,
    lastModifiedById: collection.creatorId,
    createdById: collection.creatorId,
    title: 'Introduction',
    text: '# Introduction\n\nLets get started...',
  });

  return {
    user,
    collection,
    document,
    team,
  };
};

export { seed, sequelize };
