import { DataTypes, sequelize } from "../sequelize";

const Star = sequelize.define("star", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
});

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'models' implicitly has an 'any' type.
Star.associate = (models) => {
  Star.belongsTo(models.Document);
  Star.belongsTo(models.User);
};

export default Star;
