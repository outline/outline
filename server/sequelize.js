// @flow
import Sequelize from 'sequelize';
import EncryptedField from 'sequelize-encrypted';
import debug from 'debug';

const secretKey = process.env.SEQUELIZE_SECRET;

export const encryptedFields = EncryptedField(Sequelize, secretKey);

export const DataTypes = Sequelize;

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: debug('sql'),
  typeValidation: true,
});
