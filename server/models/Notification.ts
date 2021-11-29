import { DataTypes, sequelize } from "../sequelize";

const Notification = sequelize.define(
  "notification",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    event: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.BOOLEAN,
    },
  },
  {
    timestamps: true,
    updatedAt: false,
  }
);

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'models' implicitly has an 'any' type.
Notification.associate = (models) => {
  Notification.belongsTo(models.User, {
    as: "actor",
    foreignKey: "actorId",
  });
  Notification.belongsTo(models.User, {
    as: "user",
    foreignKey: "userId",
  });
};

export default Notification;
