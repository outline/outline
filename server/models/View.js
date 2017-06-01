// @flow
import { DataTypes, sequelize } from '../sequelize';

const View = sequelize.define(
  'view',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    count: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
  },
  {
    classMethods: {
      associate: models => {
        View.belongsTo(models.Document);
        View.belongsTo(models.User);
      },
    },
  }
);

export default View;
