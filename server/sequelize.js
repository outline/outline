// @flow
import Sequelize from 'sequelize';
import EncryptedField from 'sequelize-encrypted';
import debug from 'debug';

const secretKey = process.env.SECRET_KEY;

export const encryptedFields = EncryptedField(Sequelize, secretKey);

export const DataTypes = Sequelize;
export const Op = Sequelize.Op;

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: debug('sql'),
  typeValidation: true,
  operatorsAliases: false,
});
