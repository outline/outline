// @flow
import { User, Document, Collection, Team } from '../models';
import { sequelize } from '../sequelize';

export function flushdb() {
  const sql = sequelize.getQueryInterface();
  const tables = Object.keys(sequelize.models).map(model => {
    const n = sequelize.models[model].getTableName();
    return sql.quoteTable(typeof n === 'string' ? n : n.tableName);
  });

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

  const admin = await User.create({
    id: 'fa952cff-fa64-4d42-a6ea-6955c9689046',
    email: 'admin@example.com',
    username: 'admin',
    name: 'Admin User',
    teamId: team.id,
    isAdmin: true,
    service: 'slack',
    serviceId: 'U2399UF1P',
    slackData: {
      id: 'U2399UF1P',
      image_192: 'http://example.com/avatar.png',
    },
    createdAt: new Date('2018-01-01T00:00:00.000Z'),
  });

  const user = await User.create({
    id: '46fde1d4-0050-428f-9f0b-0bf77f4bdf61',
    email: 'user1@example.com',
    username: 'user1',
    name: 'User 1',
    teamId: team.id,
    service: 'slack',
    serviceId: 'U2399UF2P',
    slackData: {
      id: 'U2399UF2P',
      image_192: 'http://example.com/avatar.png',
    },
    createdAt: new Date('2018-01-02T00:00:00.000Z'),
  });

  const collection = await Collection.create({
    id: '26fde1d4-0050-428f-9f0b-0bf77f8bdf62',
    name: 'Collection',
    urlId: 'collection',
    teamId: team.id,
    creatorId: user.id,
    type: 'atlas',
  });

  const document = await Document.create({
    parentDocumentId: null,
    collectionId: collection.id,
    teamId: team.id,
    userId: collection.creatorId,
    lastModifiedById: collection.creatorId,
    createdById: collection.creatorId,
    title: 'First ever document',
    text: '# Much test support',
  });
  await document.publish();
  await collection.reload();

  return {
    user,
    admin,
    collection,
    document,
    team,
  };
};

export { seed, sequelize };
