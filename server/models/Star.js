// @flow
import { DataTypes, sequelize } from '../sequelize';

const Star = sequelize.define('star', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
});

Star.associate = models => {
  Star.belongsTo(models.Document);
  Star.belongsTo(models.User);
};

export default Star;
