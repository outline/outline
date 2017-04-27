import { User } from '../models';
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
  await User.create({
    id: '86fde1d4-0050-428f-9f0b-0bf77f8bdf61',
    email: 'user1@example.com',
    username: 'user1',
    name: 'User 1',
    password: 'test123!',
    slackId: '123',
    slackData: {
      image_192: 'http://example.com/avatar.png',
    },
  });
};

export { seed, sequelize };
