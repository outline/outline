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
    classMethods: {},
  }
);

View.associate = models => {
  View.belongsTo(models.Document);
  View.belongsTo(models.User);
};

View.increment = async where => {
  const [model, created] = await View.findOrCreate({ where });
  if (!created) {
    model.count += 1;
    model.save();
  }
  return model;
};

export default View;
