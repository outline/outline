import crypto from 'crypto';
import {
  DataTypes,
  sequelize,
  encryptedFields,
} from '../sequelize';

import JWT from 'jsonwebtoken';

const User = sequelize.define('user', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email: { type: DataTypes.STRING, unique: true },
  username: { type: DataTypes.STRING, unique: true },
  name: DataTypes.STRING,
  isAdmin: DataTypes.BOOLEAN,
  slackAccessToken: encryptedFields.vault('slackAccessToken'),
  slackId: { type: DataTypes.STRING, allowNull: true },
  slackData: DataTypes.JSONB,
  jwtSecret: encryptedFields.vault('jwtSecret'),
}, {
  instanceMethods: {
    getJwtToken() {
      return JWT.sign({ id: this.id }, this.jwtSecret);
    },
    async getTeam() {
      return this.team;
    },
  },
  indexes: [
    {
      fields: ['email'],
    },
  ],
});

const setRandomJwtSecret = (model) => {
  model.jwtSecret = crypto.randomBytes(64).toString('hex');
};

User.beforeCreate(setRandomJwtSecret);

export default User;
